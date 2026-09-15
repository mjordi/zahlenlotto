/**
 * Hook for real-time game state synchronization across devices.
 * Uses polling with the session API for cross-device sync.
 * Integrates with BroadcastChannel for same-browser tab sync.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { SessionSync, generateHostToken } from '@/utils/session';

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
    /** Called with the replacement token after this tab takes over the session. */
    onTokenRotated: (token: string) => void;
    /** Called when the server no longer recognises us as host (another tab took over). */
    onHostRoleLost: () => void;
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
    onTokenRotated,
    onHostRoleLost,
}: UseGameSyncOptions): UseGameSyncReturn {
    const lastUpdateRef = useRef<number>(0);
    const lastCardConfigRef = useRef<string>(''); // Track card config changes
    const sessionSyncRef = useRef<SessionSync | null>(null);
    const hasHydratedRef = useRef(false);
    // Tracked apart from hydration: the token can arrive after the seed, and
    // ownership must still be claimed when it does.
    const hasRotatedRef = useRef(false);
    // Holds a replacement token whose rotation result we never saw (aborted or
    // lost response). The server may well have accepted it, so a later 403 is
    // retried with this before concluding another tab took over.
    const pendingTokenRef = useRef<string | null>(null);
    // Set the moment a write is *queued*, not when it succeeds: the mount-time
    // read must not be applied on top of a draw that is already on its way.
    const hasLocalWriteRef = useRef(false);
    const [syncUnavailable, setSyncUnavailable] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [isReading, setIsReading] = useState(isHost && enabled && !!seed);
    // Controls stay blocked while either mount phase is in flight
    const isHydrating = isRotating || isReading;

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
    const onTokenRotatedRef = useRef(onTokenRotated);
    const onHostRoleLostRef = useRef(onHostRoleLost);

    useEffect(() => {
        seedRef.current = seed;
        hostTokenRef.current = hostToken;
        isHostRef.current = isHost;
        onStateUpdateRef.current = onStateUpdate;
        onCardConfigUpdateRef.current = onCardConfigUpdate;
        onResetRef.current = onReset;
        onTokenRotatedRef.current = onTokenRotated;
        onHostRoleLostRef.current = onHostRoleLost;
    }, [seed, hostToken, isHost, onStateUpdate, onCardConfigUpdate, onReset, onTokenRotated, onHostRoleLost]);

    const claimSession = useCallback((newSeed: string, newHostToken: string) => {
        seedRef.current = newSeed;
        hostTokenRef.current = newHostToken;
        isHostRef.current = true;
        // A session minted here needs no takeover: no other tab can hold this
        // token. Rotating anyway would race the initial claim - if the rotation
        // landed first the session would still be unclaimed, the rotation would
        // store nothing, and the late claim would register the *old* token,
        // locking this tab out of the game it just started.
        hasRotatedRef.current = true;
    }, []);

    // Initialize BroadcastChannel for same-browser sync
    useEffect(() => {
        if (!seed || !enabled) return;

        const sync = new SessionSync(
            seed,
            {
                // Only guests take state from a peer. An active host is the
                // source of truth, and a tab that has just been rotated out
                // still broadcasts before its write is refused - accepting that
                // would let a demoted tab rewrite the real host's board.
                onNumberDrawn: (numbers, current) => {
                    if (!isHostRef.current) onStateUpdateRef.current(numbers, current);
                },
                onReset: () => {
                    if (!isHostRef.current) onResetRef.current();
                },
                onSyncResponse: (numbers, current) => {
                    if (!isHostRef.current) onStateUpdateRef.current(numbers, current);
                },
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
        if (!seed || !enabled || !isHost || hasRotatedRef.current || !hostToken) return;
        hasRotatedRef.current = true;
        setIsRotating(true);

        let cancelled = false;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), hydrateTimeout);

        (async () => {
            try {
                const currentToken = hostTokenRef.current;
                if (!currentToken) return;

                const nextToken = generateHostToken();
                // Remember it before sending: if the answer never arrives we
                // cannot tell whether the server took it, and losing it would
                // strand the only host on an obsolete credential.
                pendingTokenRef.current = nextToken;

                const rotation = await fetch(`/api/session/${seed}`, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-host-token': currentToken,
                    },
                    body: JSON.stringify({ rotateToken: nextToken }),
                });

                if (cancelled) return;

                if (rotation.status === 403) {
                    // Another tab already took the session over
                    lastUpdateRef.current = 0;
                    onHostRoleLostRef.current();
                    return;
                }
                if (rotation.ok) {
                    pendingTokenRef.current = null;
                    hostTokenRef.current = nextToken;
                    onTokenRotatedRef.current(nextToken);
                }
            } catch (error) {
                console.error('Session rotate error:', error);
            } finally {
                clearTimeout(timer);
                if (!cancelled) setIsRotating(false);
            }
        })();

        return () => {
            cancelled = true;
            clearTimeout(timer);
            controller.abort();
        };
    }, [seed, isHost, enabled, hostToken, hydrateTimeout]);

    /**
     * Load the stored state once (hosts only).
     *
     * Deliberately does not depend on `hostToken`: publishing a rotated token
     * updates that prop, and a dependency on it would tear this effect down
     * mid-read, abort the GET, and leave the host on an empty board with the
     * controls released - the exact overwrite the read exists to prevent.
     */
    useEffect(() => {
        if (!seed || !enabled || !isHost) return;
        if (hasHydratedRef.current) {
            setIsReading(false);
            return;
        }
        hasHydratedRef.current = true;
        setIsReading(true);

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
                if (!cancelled) setIsReading(false);
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
    const postState = useCallback(async (body: Record<string, unknown>, announce?: () => void) => {
        const currentSeed = seedRef.current;

        if (!currentSeed || !hostTokenRef.current || !isHostRef.current) return;

        // Claim the session locally before anything is awaited, so the
        // mount-time read cannot be applied over a draw already in flight
        hasLocalWriteRef.current = true;

        // Clock-seeded so it also keeps rising across a page reload
        writeSeqRef.current = Math.max(Date.now(), writeSeqRef.current + 1);
        const clientSeq = writeSeqRef.current;

        const attempt = (token: string) =>
            fetch(`/api/session/${currentSeed}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-host-token': token,
                },
                body: JSON.stringify({ ...body, clientSeq }),
            });

        const send = async () => {
            try {
                // Read at execution time, not when queued: an earlier write in
                // this chain may have recovered a rotated credential, and the
                // stale one would be refused and demote the host for nothing.
                const token = hostTokenRef.current;
                if (!token) return;

                let response = await attempt(token);

                // A rotation whose answer we never saw may still have committed
                // server-side. Before concluding another tab took over, retry
                // once with that replacement credential.
                if (response.status === 403 && pendingTokenRef.current) {
                    const candidate = pendingTokenRef.current;
                    pendingTokenRef.current = null;
                    const retry = await attempt(candidate);
                    if (retry.ok) {
                        hostTokenRef.current = candidate;
                        onTokenRotatedRef.current(candidate);
                    }
                    response = retry;
                }

                if (response.ok) {
                    const data = await response.json();
                    lastUpdateRef.current = data.lastUpdate;
                    setSyncUnavailable(false);
                    // Only now: a write refused with 403 must never reach the
                    // other tabs. Announcing first would let a tab that has
                    // already been rotated out plant a number on every guest,
                    // where it would sit until the real host writes again.
                    announce?.();
                    return;
                }

                // 403 means another tab rotated the token and owns the session
                // now; step down instead of showing a generic sync warning.
                if (response.status === 403) {
                    // The local board still shows the action the server just
                    // refused. Clear the version marker so the first guest poll
                    // applies the authoritative state instead of skipping it
                    // for being no newer than what we already had.
                    lastUpdateRef.current = 0;
                    onHostRoleLostRef.current();
                    return;
                }

                // 409 is the expected "a newer write already won" answer and
                // means sync is healthy. Anything else (503, 500, 401) means
                // the guests are no longer receiving this host's draws, so say
                // so rather than letting the host play on unaware.
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
        const body: Record<string, unknown> = { drawnNumbers, currentNumber };
        if (cardConfig) {
            body.numberOfPlayers = cardConfig.numberOfPlayers;
            body.cardsPerPlayer = cardConfig.cardsPerPlayer;
            body.playerNames = cardConfig.playerNames;
        }

        await postState(body, () =>
            sessionSyncRef.current?.broadcastNumberDrawn(drawnNumbers, currentNumber)
        );
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
        await postState(
            { drawnNumbers: [], currentNumber: null },
            () => sessionSyncRef.current?.broadcastReset()
        );
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
