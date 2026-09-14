/**
 * API route for session state management.
 * Enables cross-device real-time sync via polling with Vercel KV.
 *
 * Writes are restricted to the host: the first writer for a seed claims the
 * session with a secret token (never part of the shareable URL) and every
 * later write must present the same token.
 */

import { NextRequest, NextResponse } from 'next/server';

// Conditional KV import - only use when Vercel KV is configured
let kv: typeof import('@vercel/kv').kv | null = null;

async function getKV() {
    if (kv) return kv;

    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const { kv: vercelKv } = await import('@vercel/kv');
        kv = vercelKv;
        return kv;
    }

    return null;
}

/**
 * In-memory fallback for local development only.
 * It is per-process, so it cannot work across serverless instances - production
 * requests fail loudly instead (see requireStore) rather than silently desyncing.
 */
const memoryStore = new Map<string, GameState>();

const MIN_HOST_TOKEN_LENGTH = 16;
const SESSION_TTL_SECONDS = 86400;

interface GameState {
    drawnNumbers: number[];
    currentNumber: number | null;
    lastUpdate: number;
    // Card configuration, set once the host generates cards
    numberOfPlayers?: number;
    cardsPerPlayer?: number;
    playerNames?: string[];
    // Strictly increasing per host write, used to refuse out-of-order arrivals
    clientSeq?: number;
    // Secret proving session ownership - never sent to clients
    hostToken?: string;
}

const EMPTY_STATE: GameState = {
    drawnNumbers: [],
    currentNumber: null,
    lastUpdate: 0,
};

function isValidSeed(seed: string | undefined): seed is string {
    return typeof seed === 'string' && seed.length >= 4 && seed.length <= 64;
}

/**
 * Resolves the storage backend, or an error response when misconfigured.
 * Deploying without Vercel KV would silently break cross-device sync, so we
 * surface it as a 503 instead of falling back to per-instance memory.
 */
async function requireStore(): Promise<
    { kvClient: Awaited<ReturnType<typeof getKV>> } | { error: NextResponse }
> {
    const kvClient = await getKV();

    if (!kvClient && process.env.NODE_ENV === 'production') {
        return {
            error: NextResponse.json(
                { error: 'Sync storage is not configured (KV_REST_API_URL / KV_REST_API_TOKEN missing)' },
                { status: 503 }
            ),
        };
    }

    return { kvClient };
}

async function readState(
    kvClient: Awaited<ReturnType<typeof getKV>>,
    seed: string
): Promise<GameState | null> {
    if (kvClient) {
        return (await kvClient.get<GameState>(`game:${seed}`)) ?? null;
    }
    return memoryStore.get(seed) ?? null;
}

/** Prune expired entries from the development store. */
function pruneMemoryStore(): void {
    const cutoff = Date.now() - SESSION_TTL_SECONDS * 1000;
    for (const [key, value] of memoryStore.entries()) {
        if (value.lastUpdate < cutoff) {
            memoryStore.delete(key);
        }
    }
}

type CommitResult =
    | { status: 'written'; state: GameState }
    | { status: 'forbidden' }
    | { status: 'stale'; current: GameState };

/**
 * Decides what a host write should do against the state already stored.
 * Pure, so both storage backends apply exactly the same rules.
 */
function decideWrite(
    existing: GameState | null,
    incoming: Omit<GameState, 'hostToken'>,
    hostToken: string
): CommitResult {
    // The first writer claims the session; later writes must match it
    if (existing?.hostToken && existing.hostToken !== hostToken) {
        return { status: 'forbidden' };
    }

    // Two host writes can overlap in flight (a slow draw, then a reset).
    // Refuse the one that was already overtaken rather than letting it
    // resurrect state the host has since replaced.
    if (
        incoming.clientSeq !== undefined &&
        existing?.clientSeq !== undefined &&
        incoming.clientSeq < existing.clientSeq
    ) {
        return { status: 'stale', current: existing };
    }

    return {
        status: 'written',
        state: {
            ...incoming,
            // Preserve card configuration unless this request supplies one
            numberOfPlayers: incoming.numberOfPlayers ?? existing?.numberOfPlayers,
            cardsPerPlayer: incoming.cardsPerPlayer ?? existing?.cardsPerPlayer,
            playerNames: incoming.playerNames ?? existing?.playerNames,
            clientSeq: incoming.clientSeq ?? existing?.clientSeq,
            hostToken: existing?.hostToken ?? hostToken,
        },
    };
}

/**
 * Applies a host write unless a newer one already landed.
 *
 * The check and the write belong together: two overlapping POSTs could
 * otherwise both read the old sequence, both pass, and the older one land last.
 * The in-memory store does all of it in one synchronous block, which Node's
 * single thread makes indivisible.
 *
 * On Vercel KV the read and the write are still two round trips, so a narrow
 * window remains there. It needs two concurrent host writers to be reachable,
 * which the design already rules out: the host token lives in sessionStorage,
 * which is per tab, so a session has exactly one host tab, and that tab chains
 * its writes. Closing it completely needs a Lua compare-and-set (see AGENTS.md).
 */
async function commitState(
    kvClient: Awaited<ReturnType<typeof getKV>>,
    seed: string,
    incoming: Omit<GameState, 'hostToken'>,
    hostToken: string
): Promise<CommitResult> {
    if (kvClient) {
        const existing = (await kvClient.get<GameState>(`game:${seed}`)) ?? null;
        const result = decideWrite(existing, incoming, hostToken);
        if (result.status === 'written') {
            await kvClient.set(`game:${seed}`, result.state, { ex: SESSION_TTL_SECONDS });
        }
        return result;
    }

    // Single synchronous block - nothing can interleave between read and write
    const existing = memoryStore.get(seed) ?? null;
    const result = decideWrite(existing, incoming, hostToken);
    if (result.status === 'written') {
        memoryStore.set(seed, result.state);
        pruneMemoryStore();
    }
    return result;
}

/** Strips server-only fields before sending state to a client. */
function toPublicState(state: GameState): Omit<GameState, 'hostToken'> {
    return {
        drawnNumbers: state.drawnNumbers,
        currentNumber: state.currentNumber,
        lastUpdate: state.lastUpdate,
        numberOfPlayers: state.numberOfPlayers,
        cardsPerPlayer: state.cardsPerPlayer,
        playerNames: state.playerNames,
        clientSeq: state.clientSeq,
    };
}

/**
 * GET /api/session/[seed]
 * Poll for current game state. Readable by anyone holding the share link.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ seed: string }> }
) {
    try {
        const { seed } = await params;

        if (!isValidSeed(seed)) {
            return NextResponse.json({ error: 'Invalid seed' }, { status: 400 });
        }

        const store = await requireStore();
        if ('error' in store) return store.error;

        const state = await readState(store.kvClient, seed);
        return NextResponse.json(state ? toPublicState(state) : EMPTY_STATE);
    } catch (error) {
        console.error('GET session error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/session/[seed]
 * Update game state. Requires the host token that claimed the session.
 *
 * Card configuration is merged: a plain draw update keeps the stored cards.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ seed: string }> }
) {
    try {
        const { seed } = await params;

        if (!isValidSeed(seed)) {
            return NextResponse.json({ error: 'Invalid seed' }, { status: 400 });
        }

        const hostToken = request.headers.get('x-host-token');
        if (!hostToken || hostToken.length < MIN_HOST_TOKEN_LENGTH) {
            return NextResponse.json({ error: 'Missing host token' }, { status: 401 });
        }

        const body = await request.json();

        if (!Array.isArray(body.drawnNumbers)) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const validNumbers = body.drawnNumbers.every(
            (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 90
        );
        if (!validNumbers) {
            return NextResponse.json({ error: 'Invalid drawn numbers' }, { status: 400 });
        }

        const store = await requireStore();
        if ('error' in store) return store.error;

        const incoming: Omit<GameState, 'hostToken'> = {
            drawnNumbers: body.drawnNumbers,
            currentNumber: typeof body.currentNumber === 'number' ? body.currentNumber : null,
            lastUpdate: Date.now(),
            clientSeq: typeof body.clientSeq === 'number' ? body.clientSeq : undefined,
        };

        if (
            typeof body.numberOfPlayers === 'number' &&
            body.numberOfPlayers >= 1 &&
            body.numberOfPlayers <= 20
        ) {
            incoming.numberOfPlayers = body.numberOfPlayers;
        }
        if (
            typeof body.cardsPerPlayer === 'number' &&
            body.cardsPerPlayer >= 1 &&
            body.cardsPerPlayer <= 10
        ) {
            incoming.cardsPerPlayer = body.cardsPerPlayer;
        }
        if (Array.isArray(body.playerNames)) {
            incoming.playerNames = body.playerNames
                .filter((n: unknown) => typeof n === 'string')
                .slice(0, 20);
        }

        const result = await commitState(store.kvClient, seed, incoming, hostToken);

        if (result.status === 'forbidden') {
            return NextResponse.json({ error: 'Not the session host' }, { status: 403 });
        }
        if (result.status === 'stale') {
            return NextResponse.json(
                { error: 'Stale update', lastUpdate: result.current.lastUpdate },
                { status: 409 }
            );
        }

        return NextResponse.json({ ok: true, lastUpdate: result.state.lastUpdate });
    } catch (error) {
        console.error('POST session error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
