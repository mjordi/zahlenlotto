/**
 * API route for session state management.
 * Enables cross-device real-time sync via polling with Vercel KV.
 */

import { NextRequest, NextResponse } from 'next/server';

// Conditional KV import - only use in production with Vercel KV configured
let kv: typeof import('@vercel/kv').kv | null = null;

async function getKV() {
    if (kv) return kv;

    // Only initialize KV if environment variables are configured
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const { kv: vercelKv } = await import('@vercel/kv');
        kv = vercelKv;
        return kv;
    }

    return null;
}

// In-memory fallback for development (single instance only)
const memoryStore = new Map<string, GameState>();

interface GameState {
    drawnNumbers: number[];
    currentNumber: number | null;
    lastUpdate: number;
    // Card configuration (synced when host generates cards)
    numberOfPlayers?: number;
    cardsPerPlayer?: number;
    playerNames?: string[];
}

/**
 * GET /api/session/[seed]
 * Poll for current game state.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ seed: string }> }
) {
    try {
        const { seed } = await params;

        if (!seed || typeof seed !== 'string' || seed.length < 4) {
            return NextResponse.json(
                { error: 'Invalid seed' },
                { status: 400 }
            );
        }

        const kvClient = await getKV();

        if (kvClient) {
            // Production: use Vercel KV
            const state = await kvClient.get<GameState>(`game:${seed}`);
            return NextResponse.json(state || {
                drawnNumbers: [],
                currentNumber: null,
                lastUpdate: 0,
            });
        } else {
            // Development fallback: use in-memory store
            const state = memoryStore.get(seed);
            return NextResponse.json(state || {
                drawnNumbers: [],
                currentNumber: null,
                lastUpdate: 0,
            });
        }
    } catch (error) {
        console.error('GET session error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/session/[seed]
 * Update game state (host only - client should verify).
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ seed: string }> }
) {
    try {
        const { seed } = await params;

        if (!seed || typeof seed !== 'string' || seed.length < 4) {
            return NextResponse.json(
                { error: 'Invalid seed' },
                { status: 400 }
            );
        }

        const body = await request.json();

        // Validate request body
        if (!Array.isArray(body.drawnNumbers)) {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        }

        // Validate drawn numbers (must be 1-90)
        const validNumbers = body.drawnNumbers.every(
            (n: unknown) => typeof n === 'number' && n >= 1 && n <= 90
        );
        if (!validNumbers) {
            return NextResponse.json(
                { error: 'Invalid drawn numbers' },
                { status: 400 }
            );
        }

        const state: GameState = {
            drawnNumbers: body.drawnNumbers,
            currentNumber: body.currentNumber ?? null,
            lastUpdate: Date.now(),
        };

        // Include card configuration if provided
        if (typeof body.numberOfPlayers === 'number' && body.numberOfPlayers >= 1 && body.numberOfPlayers <= 20) {
            state.numberOfPlayers = body.numberOfPlayers;
        }
        if (typeof body.cardsPerPlayer === 'number' && body.cardsPerPlayer >= 1 && body.cardsPerPlayer <= 10) {
            state.cardsPerPlayer = body.cardsPerPlayer;
        }
        if (Array.isArray(body.playerNames)) {
            state.playerNames = body.playerNames.filter((n: unknown) => typeof n === 'string').slice(0, 20);
        }

        const kvClient = await getKV();

        if (kvClient) {
            // Production: use Vercel KV with 24-hour expiration
            await kvClient.set(`game:${seed}`, state, { ex: 86400 });
        } else {
            // Development fallback: use in-memory store
            memoryStore.set(seed, state);

            // Clean up old entries after 24 hours
            const oneDayAgo = Date.now() - 86400000;
            for (const [key, value] of memoryStore.entries()) {
                if (value.lastUpdate < oneDayAgo) {
                    memoryStore.delete(key);
                }
            }
        }

        return NextResponse.json({ ok: true, lastUpdate: state.lastUpdate });
    } catch (error) {
        console.error('POST session error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/session/[seed]
 * Clear game state (reset).
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ seed: string }> }
) {
    try {
        const { seed } = await params;

        if (!seed || typeof seed !== 'string' || seed.length < 4) {
            return NextResponse.json(
                { error: 'Invalid seed' },
                { status: 400 }
            );
        }

        const kvClient = await getKV();

        if (kvClient) {
            await kvClient.del(`game:${seed}`);
        } else {
            memoryStore.delete(seed);
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('DELETE session error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
