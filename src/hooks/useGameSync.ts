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
}

interface UseGameSyncOptions {
    seed: string | null;
    hostToken: string | null;
    isHost: boolean;
    enabled: boolean;
    pollingInterval?: number; // ms, default 2000
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
    onStateUpdate,
    onCardConfigUpdate,
    onReset,
}: UseGameSyncOptions): UseGameSyncReturn {
    const lastUpdateRef = useRef<number>(0);
    const lastCardConfigRef = useRef<string>(''); // Track card config changes
    const sessionSyncRef = useRef<SessionSync | null>(null);
    const [syncUnavailable, setSyncUnavailable] = useState(false);

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

    // Poll for updates (guests only)
    useEffect(() => {
        if (!seed || !enabled || isHost) return;

        let cancelled = false;

        const poll = async () => {
            try {
                const response = await fetch(`/api/session/${seed}`);

                if (response.status === 503) {
                    if (!cancelled) setSyncUnavailable(true);
                    return;
                }
                if (!response.ok) return;

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
            }
        };

        poll();
        const interval = setInterval(poll, pollingInterval);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [seed, isHost, enabled, pollingInterval]);

    /** Sends state to the server. Returns silently when we are not the host. */
    const postState = useCallback(async (body: Record<string, unknown>) => {
        const currentSeed = seedRef.current;
        const currentToken = hostTokenRef.current;

        if (!currentSeed || !currentToken || !isHostRef.current) return;

        try {
            const response = await fetch(`/api/session/${currentSeed}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-host-token': currentToken,
                },
                body: JSON.stringify(body),
            });

            if (response.status === 503) {
                setSyncUnavailable(true);
                return;
            }

            if (response.ok) {
                const data = await response.json();
                lastUpdateRef.current = data.lastUpdate;
                setSyncUnavailable(false);
            }
        } catch (error) {
            console.error('Sync push error:', error);
        }
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
    };
}
