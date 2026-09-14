/**
 * Hook for real-time game state synchronization across devices.
 * Uses polling with the session API for cross-device sync.
 * Integrates with BroadcastChannel for same-browser tab sync.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { SessionSync } from '@/utils/session';

export interface CardConfig {
    numberOfPlayers: number;
    cardsPerPlayer: number;
    playerNames: string[];
}

interface GameState {
    drawnNumbers: number[];
    currentNumber: number | null;
    lastUpdate: number;
    numberOfPlayers?: number;
    cardsPerPlayer?: number;
    playerNames?: string[];
    clientSeq?: number;
}

interface UseGameSyncOptions {
    seed: string | null;
    hostToken: string | null;
    isHost: boolean;
    enabled: boolean;
    pollingInterval?: number; // ms, default 2000
    hydrateTimeout?: number; // ms, default 5000
    onStateUpdate: (drawnNumbers: number[], currentNumber: number | null) => void;
    onCardConfigUpdate: (config: CardConfig) => void;
    onReset: () => void;
}

interface UseGameSyncReturn {
    /**
     * Registers a freshly created session so the very next push uses it.
     * Needed because a push can fire before React re-renders with the new seed.
     */
    claimSession: (seed: string, hostToken: string) => void;
    pushState: (drawnNumbers: number[], currentNumber: number | null, cardConfig?: CardConfig) => Promise<void>;
    pushCardConfig: (config: CardConfig, drawnNumbers: number[], currentNumber: number | null) => Promise<void>;
    resetState: () => Promise<void>;
    /** True when the server cannot store session state (e.g. KV not configured). */
    syncUnavailable: boolean;
    /**
     * True while a host is reading the stored session on mount. Drawing has to
     * wait for it: a draw computed from the pre-hydration board would overwrite
     * the real history the refresh was meant to resume.
     */
    isHydrating: boolean;
}

/**
 * Custom hook for cross-device game synchronization.
 *
 * For hosts: Pushes state updates to the server.
 * For guests: Polls the server for state updates.
 * Both: Uses BroadcastChannel for same-browser sync.
 */
export function useGameSync({
    seed,
    hostToken,
    isHost,
    enabled,
    pollingInterval = 2000,
    hydrateTimeout = 5000,
    onStateUpdate,
    onCardConfigUpdate,
    onReset,
}: UseGameSyncOptions): UseGameSyncReturn {
    const lastUpdateRef = useRef<number>(0);
    const lastCardConfigRef = useRef<string>(''); // Track card config changes
    const sessionSyncRef = useRef<SessionSync | null>(null);
    const hasHydratedRef = useRef(false);
    // Set the moment a write is *queued*, not when it succeeds: the mount-time
    // read must not be applied on top of a draw that is already on its way.
    const hasLocalWriteRef = useRef(false);
    const [syncUnavailable, setSyncUnavailable] = useState(false);
    const [isHydrating, setIsHydrating] = useState(isHost && enabled && !!seed);

    // Host writes are stamped with a strictly increasing sequence and chained,
    // so two overlapping pushes can never land out of order (see postState).
    // Seeded from the clock so it keeps rising across a page reload too.
    const writeSeqRef = useRef(0);
    const writeChainRef = useRef<Promise<void>>(Promise.resolve());

    // Session identity lives in refs so pushes never read a stale closure:
    // a session created during an event handler must be usable immediately.
    const seedRef = useRef<string | null>(seed);
    const hostTokenRef = useRef<string | null>(hostToken);
    const isHostRef = useRef<boolean>(isHost);

    // Callbacks live in refs so the polling/broadcast effects stay mounted
    // instead of restarting every time a parent callback changes identity.
    const onStateUpdateRef = useRef(onStateUpdate);
    const onCardConfigUpdateRef = useRef(onCardConfigUpdate);
    const onResetRef = useRef(onReset);

    useEffect(() => {
        seedRef.current = seed;
        hostTokenRef.current = hostToken;
        isHostRef.current = isHost;
        onStateUpdateRef.current = onStateUpdate;
        onCardConfigUpdateRef.current = onCardConfigUpdate;
        onResetRef.current = onReset;
    }, [seed, hostToken, isHost, onStateUpdate, onCardConfigUpdate, onReset]);

    const claimSession = useCallback((newSeed: string, newHostToken: string) => {
        seedRef.current = newSeed;
        hostTokenRef.current = newHostToken;
        isHostRef.current = true;
    }, []);

    // Initialize BroadcastChannel for same-browser sync
    useEffect(() => {
        if (!seed || !enabled) return;

        const sync = new SessionSync(
            seed,
            {
                onNumberDrawn: (numbers, current) => onStateUpdateRef.current(numbers, current),
                onReset: () => onResetRef.current(),
                onSyncResponse: (numbers, current) => onStateUpdateRef.current(numbers, current),
            },
            isHost
        );

        sessionSyncRef.current = sync;

        return () => {
            sync.destroy();
            sessionSyncRef.current = null;
        };
    }, [seed, isHost, enabled]);

    /**
     * Load the stored state once (hosts only).
     *
     * Hosts never poll, so without this a refreshed host would resume with an
     * empty board and its next push would wipe the real session out from under
     * the guests. Applies only while we have not written anything ourselves, so
     * it can never undo a draw the host just made.
     */
    useEffect(() => {
        if (!seed || !enabled || !isHost) return;
        if (hasHydratedRef.current) {
            setIsHydrating(false);
            return;
        }
        hasHydratedRef.current = true;
        setIsHydrating(true);

        let cancelled = false;

        // Drawing is blocked while this runs, so it must not be able to hang.
        // An unreachable API has to degrade to local play, never lock the host
        // out of their own game until the browser's default timeout expires.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), hydrateTimeout);

        (async () => {
            try {
                const response = await fetch(`/api/session/${seed}`, { signal: controller.signal });
                if (!response.ok) return;

                const state: GameState = await response.json();

                // Never apply on top of a write we have already started - that
                // draw was computed from the pre-hydration board.
                if (cancelled || state.lastUpdate <= 0 || hasLocalWriteRef.current) return;

                lastUpdateRef.current = state.lastUpdate;
                // Keep our writes above anything the previous page load sent
                if (state.clientSeq && state.clientSeq > writeSeqRef.current) {
                    writeSeqRef.current = state.clientSeq;
                }

                // An empty, timestamped state is a reset the host recorded
                // earlier; resuming from a stale share URL must honour it
                // rather than resurrect the numbers that link still carries.
                if (state.drawnNumbers.length === 0) {
                    onResetRef.current();
                } else {
                    onStateUpdateRef.current(state.drawnNumbers, state.currentNumber);
                }

                if (state.numberOfPlayers && state.cardsPerPlayer) {
                    const names = state.playerNames || [];
                    lastCardConfigRef.current = `${state.numberOfPlayers}-${state.cardsPerPlayer}-${JSON.stringify(names)}`;
                    onCardConfigUpdateRef.current({
                        numberOfPlayers: state.numberOfPlayers,
                        cardsPerPlayer: state.cardsPerPlayer,
                        playerNames: names,
                    });
                }
            } catch (error) {
                console.error('Session hydrate error:', error);
            } finally {
                clearTimeout(timer);
                // Always release the host, however this ended
                if (!cancelled) setIsHydrating(false);
            }
        })();

        return () => {
            cancelled = true;
            clearTimeout(timer);
            controller.abort();
        };
    }, [seed, isHost, enabled, hydrateTimeout]);

    // Poll for updates (guests only)
    useEffect(() => {
        if (!seed || !enabled || isHost) return;

        let cancelled = false;

        const poll = async () => {
            try {
                const response = await fetch(`/api/session/${seed}`);

                // Any failed poll means this spectator is watching numbers that
                // may already be stale, so say so - the same way a host is told
                // when its pushes stop landing.
                if (!response.ok) {
                    if (!cancelled) setSyncUnavailable(true);
                    return;
                }

                const state: GameState = await response.json();
                if (cancelled) return;

                setSyncUnavailable(false);

                // `lastUpdate: 0` means the server holds no state for this session;
                // leave whatever the guest restored from the share URL alone.
                const previousUpdate = lastUpdateRef.current;
                if (state.lastUpdate <= 0 || state.lastUpdate <= previousUpdate) return;

                lastUpdateRef.current = state.lastUpdate;

                // An empty, timestamped state is an explicit reset by the host
                if (state.drawnNumbers.length === 0) {
                    onResetRef.current();
                } else {
                    onStateUpdateRef.current(state.drawnNumbers, state.currentNumber);
                }

                // Apply card configuration once the host has generated cards
                if (state.numberOfPlayers && state.cardsPerPlayer) {
                    const names = state.playerNames || [];
                    const configKey = `${state.numberOfPlayers}-${state.cardsPerPlayer}-${JSON.stringify(names)}`;
                    if (configKey !== lastCardConfigRef.current) {
                        lastCardConfigRef.current = configKey;
                        onCardConfigUpdateRef.current({
                            numberOfPlayers: state.numberOfPlayers,
                            cardsPerPlayer: state.cardsPerPlayer,
                            playerNames: names,
                        });
                    }
                }
            } catch (error) {
                console.error('Polling error:', error);
                if (!cancelled) setSyncUnavailable(true);
            }
        };

        poll();
        const interval = setInterval(poll, pollingInterval);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [seed, isHost, enabled, pollingInterval]);

    /**
     * Sends state to the server. Returns silently when we are not the host.
     *
     * Writes are queued behind each other and carry a strictly increasing
     * `clientSeq`. Without both, a slow draw followed by a fast reset could
     * arrive in the wrong order and the stale draw would overwrite the reset,
     * pushing every guest back to numbers the host had already cleared. The
     * chain prevents the overlap; the sequence lets the server refuse anything
     * that still slips through.
     */
    const postState = useCallback(async (body: Record<string, unknown>) => {
        const currentSeed = seedRef.current;
        const currentToken = hostTokenRef.current;

        if (!currentSeed || !currentToken || !isHostRef.current) return;

        // Claim the session locally before anything is awaited, so the
        // mount-time read cannot be applied over a draw already in flight
        hasLocalWriteRef.current = true;

        // Clock-seeded so it also keeps rising across a page reload
        writeSeqRef.current = Math.max(Date.now(), writeSeqRef.current + 1);
        const clientSeq = writeSeqRef.current;

        const send = async () => {
            try {
                const response = await fetch(`/api/session/${currentSeed}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-host-token': currentToken,
                    },
                    body: JSON.stringify({ ...body, clientSeq }),
                });

                if (response.ok) {
                    const data = await response.json();
                    lastUpdateRef.current = data.lastUpdate;
                    setSyncUnavailable(false);
                    return;
                }

                // 409 is the expected "a newer write already won" answer and
                // means sync is healthy. Anything else (503, 500, 401, 403)
                // means the guests are no longer receiving this host's draws,
                // so say so rather than letting the host play on unaware.
                if (response.status !== 409) {
                    console.error('Sync push rejected:', response.status);
                    setSyncUnavailable(true);
                }
            } catch (error) {
                console.error('Sync push error:', error);
                setSyncUnavailable(true);
            }
        };

        const queued = writeChainRef.current.then(send);
        // Keep the chain alive even if one write throws
        writeChainRef.current = queued.catch(() => undefined);
        return queued;
    }, []);

    // Push state to server (host only)
    const pushState = useCallback(async (
        drawnNumbers: number[],
        currentNumber: number | null,
        cardConfig?: CardConfig
    ) => {
        // Broadcast to same-browser tabs first - it is instant and never fails
        sessionSyncRef.current?.broadcastNumberDrawn(drawnNumbers, currentNumber);

        const body: Record<string, unknown> = { drawnNumbers, currentNumber };
        if (cardConfig) {
            body.numberOfPlayers = cardConfig.numberOfPlayers;
            body.cardsPerPlayer = cardConfig.cardsPerPlayer;
            body.playerNames = cardConfig.playerNames;
        }

        await postState(body);
    }, [postState]);

    // Push card configuration to server (host only) - called when generating cards
    const pushCardConfig = useCallback(async (
        config: CardConfig,
        drawnNumbers: number[],
        currentNumber: number | null
    ) => {
        await postState({
            drawnNumbers,
            currentNumber,
            numberOfPlayers: config.numberOfPlayers,
            cardsPerPlayer: config.cardsPerPlayer,
            playerNames: config.playerNames,
        });
    }, [postState]);

    /**
     * Clears the draw for everyone. Stored as an empty, freshly timestamped
     * state (not a delete) so guests actually observe the change while the
     * generated cards stay intact.
     */
    const resetState = useCallback(async () => {
        sessionSyncRef.current?.broadcastReset();
        await postState({ drawnNumbers: [], currentNumber: null });
    }, [postState]);

    return {
        claimSession,
        pushState,
        pushCardConfig,
        resetState,
        syncUnavailable,
        isHydrating,
    };
}
