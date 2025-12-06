/**
 * Hook for real-time game state synchronization across devices.
 * Uses polling with the session API for cross-device sync.
 * Integrates with BroadcastChannel for same-browser tab sync.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { SessionSync } from '@/utils/session';

interface GameState {
    drawnNumbers: number[];
    currentNumber: number | null;
    lastUpdate: number;
}

interface UseGameSyncOptions {
    seed: string | null;
    isHost: boolean;
    enabled: boolean;
    pollingInterval?: number; // ms, default 2000
    onStateUpdate: (drawnNumbers: number[], currentNumber: number | null) => void;
    onReset: () => void;
}

interface UseGameSyncReturn {
    pushState: (drawnNumbers: number[], currentNumber: number | null) => Promise<void>;
    resetState: () => Promise<void>;
    isConnected: boolean;
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
    isHost,
    enabled,
    pollingInterval = 2000,
    onStateUpdate,
    onReset,
}: UseGameSyncOptions): UseGameSyncReturn {
    const lastUpdateRef = useRef<number>(0);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const sessionSyncRef = useRef<SessionSync | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Initialize BroadcastChannel for same-browser sync
    useEffect(() => {
        if (!seed || !enabled) return;

        sessionSyncRef.current = new SessionSync(
            seed,
            {
                onNumberDrawn: (numbers, current) => {
                    onStateUpdate(numbers, current);
                },
                onReset: () => {
                    onReset();
                },
                onSyncResponse: (numbers, current) => {
                    onStateUpdate(numbers, current);
                },
            },
            isHost
        );

        // If host, listen for sync requests from other tabs
        if (isHost) {
            // This is handled by the component passing getCurrentState
        }

        return () => {
            sessionSyncRef.current?.destroy();
            sessionSyncRef.current = null;
        };
    }, [seed, isHost, enabled, onStateUpdate, onReset]);

    // Poll for updates (guests only)
    useEffect(() => {
        if (!seed || !enabled || isHost) return;

        const poll = async () => {
            try {
                const response = await fetch(`/api/session/${seed}`);
                if (!response.ok) return;

                const state: GameState = await response.json();

                // Only update if there are new changes
                if (state.lastUpdate > lastUpdateRef.current) {
                    lastUpdateRef.current = state.lastUpdate;
                    setIsConnected(true);

                    // Check if it's a reset (empty drawn numbers after having some)
                    if (state.drawnNumbers.length === 0 && lastUpdateRef.current > 0) {
                        onReset();
                    } else {
                        onStateUpdate(state.drawnNumbers, state.currentNumber);
                    }
                }
            } catch (error) {
                console.error('Polling error:', error);
                setIsConnected(false);
            }
        };

        // Initial poll
        poll();

        // Set up polling interval
        pollingRef.current = setInterval(poll, pollingInterval);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [seed, isHost, enabled, pollingInterval, onStateUpdate, onReset]);

    // Push state to server (host only)
    const pushState = useCallback(async (drawnNumbers: number[], currentNumber: number | null) => {
        if (!seed || !isHost) return;

        // Broadcast to same-browser tabs
        sessionSyncRef.current?.broadcastNumberDrawn(drawnNumbers, currentNumber);

        // Push to server for cross-device sync
        try {
            const response = await fetch(`/api/session/${seed}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ drawnNumbers, currentNumber }),
            });

            if (response.ok) {
                const data = await response.json();
                lastUpdateRef.current = data.lastUpdate;
                setIsConnected(true);
            }
        } catch (error) {
            console.error('Push state error:', error);
            setIsConnected(false);
        }
    }, [seed, isHost]);

    // Reset state on server (host only)
    const resetState = useCallback(async () => {
        if (!seed || !isHost) return;

        // Broadcast reset to same-browser tabs
        sessionSyncRef.current?.broadcastReset();

        // Reset on server
        try {
            await fetch(`/api/session/${seed}`, {
                method: 'DELETE',
            });
            lastUpdateRef.current = Date.now();
        } catch (error) {
            console.error('Reset state error:', error);
        }
    }, [seed, isHost]);

    return {
        pushState,
        resetState,
        isConnected,
    };
}
