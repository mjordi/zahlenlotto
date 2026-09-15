/**
 * Tests for the cross-device sync hook.
 * `fetch` is mocked so the tests assert what the hook sends and how it reacts
 * to polled state, without needing the API route or Vercel KV.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameSync } from '../useGameSync';

interface PolledState {
    drawnNumbers: number[];
    currentNumber: number | null;
    lastUpdate: number;
    numberOfPlayers?: number;
    cardsPerPlayer?: number;
    playerNames?: string[];
}

const HOST_TOKEN = 'host-token-for-tests-0123456789';

/**
 * jsdom ships no BroadcastChannel, so SessionSync silently skips the whole
 * cross-tab path there. This in-memory stand-in delivers to every other open
 * channel of the same name, which is the behaviour the hook relies on.
 */
class TestBroadcastChannel {
    static open: TestBroadcastChannel[] = [];
    onmessage: ((event: { data: unknown }) => void) | null = null;

    constructor(readonly name: string) {
        TestBroadcastChannel.open.push(this);
    }

    postMessage(data: unknown) {
        for (const peer of TestBroadcastChannel.open) {
            if (peer !== this && peer.name === this.name) {
                peer.onmessage?.({ data });
            }
        }
    }

    close() {
        TestBroadcastChannel.open = TestBroadcastChannel.open.filter(c => c !== this);
    }
}

beforeAll(() => {
    (globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel = TestBroadcastChannel;
});

afterEach(() => {
    TestBroadcastChannel.open = [];
});

let fetchMock: jest.Mock;

/** Latest state the fake server would return from GET. */
let serverState: PolledState;
/** State-writing POSTs the hook sent, with their headers. */
let posts: { seed: string; body: Record<string, unknown>; token: string | null }[];
/** Ownership-rotation POSTs, kept apart so state assertions stay readable. */
let rotations: { seed: string; body: Record<string, unknown>; token: string | null }[];

beforeEach(() => {
    serverState = { drawnNumbers: [], currentNumber: null, lastUpdate: 0 };
    posts = [];
    rotations = [];

    fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
        const seed = url.replace('/api/session/', '');

        if (init?.method === 'POST') {
            const headers = (init.headers ?? {}) as Record<string, string>;
            const body = JSON.parse(init.body as string);
            const entry = { seed, body, token: headers['x-host-token'] ?? null };

            if (body.rotateToken !== undefined) {
                rotations.push(entry);
                return { ok: true, status: 200, json: async () => ({ ok: true, rotated: true }) };
            }

            posts.push(entry);
            return {
                ok: true,
                status: 200,
                json: async () => ({ ok: true, lastUpdate: Date.now() }),
            };
        }

        return { ok: true, status: 200, json: async () => serverState };
    });

    global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
    jest.restoreAllMocks();
});

function renderSync(overrides: Partial<Parameters<typeof useGameSync>[0]> = {}) {
    const callbacks = {
        onStateUpdate: jest.fn(),
        onCardConfigUpdate: jest.fn(),
        onReset: jest.fn(),
        onTokenRotated: jest.fn(),
        onHostRoleLost: jest.fn(),
    };

    const utils = renderHook(
        (props: Partial<Parameters<typeof useGameSync>[0]>) =>
            useGameSync({
                seed: null,
                hostToken: null,
                isHost: true,
                enabled: true,
                pollingInterval: 10,
                ...callbacks,
                ...overrides,
                ...props,
            }),
        { initialProps: {} as Partial<Parameters<typeof useGameSync>[0]> }
    );

    return { ...utils, callbacks };
}

describe('useGameSync', () => {
    describe('host pushes', () => {
        it('should not push before a session exists', async () => {
            const { result } = renderSync();

            await act(async () => {
                await result.current.pushState([1], 1);
            });

            expect(posts).toHaveLength(0);
        });

        it('should push using a session claimed in the same tick', async () => {
            // Reproduces the stale-closure bug: a session created during an
            // event handler must be usable before React re-renders.
            const { result } = renderSync();

            await act(async () => {
                result.current.claimSession('freshSeed', HOST_TOKEN);
                await result.current.pushState([42], 42);
            });

            expect(posts).toHaveLength(1);
            expect(posts[0].seed).toBe('freshSeed');
            expect(posts[0].token).toBe(HOST_TOKEN);
            expect(posts[0].body.drawnNumbers).toEqual([42]);
        });

        it('should push card config against a session claimed in the same tick', async () => {
            const { result } = renderSync();

            await act(async () => {
                result.current.claimSession('freshSeed', HOST_TOKEN);
                await result.current.pushCardConfig(
                    { numberOfPlayers: 2, cardsPerPlayer: 3, playerNames: ['Alice', 'Bob'] },
                    [],
                    null
                );
            });

            expect(posts).toHaveLength(1);
            expect(posts[0].seed).toBe('freshSeed');
            expect(posts[0].body).toMatchObject({
                numberOfPlayers: 2,
                cardsPerPlayer: 3,
                playerNames: ['Alice', 'Bob'],
            });
        });

        it('should send a reset as an empty state, not a delete', async () => {
            const { result } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN });

            await act(async () => {
                await result.current.resetState();
            });

            expect(posts).toHaveLength(1);
            expect(posts[0].body).toMatchObject({ drawnNumbers: [], currentNumber: null });
            expect(fetchMock.mock.calls.every(([, init]) => init?.method !== 'DELETE')).toBe(true);
        });

        it('should not push as a guest', async () => {
            const { result } = renderSync({ seed: 'seedA', hostToken: null, isHost: false });

            await act(async () => {
                await result.current.pushState([1], 1);
                await result.current.resetState();
            });

            expect(posts).toHaveLength(0);
        });

        it.each([500, 401])(
            'should report sync as unavailable on a %i response',
            async (status) => {
                fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
                    if (init?.method === 'POST') {
                        return { ok: false, status, json: async () => ({ error: 'nope' }) };
                    }
                    return { ok: true, status: 200, json: async () => serverState };
                });

                const { result } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN });

                await act(async () => {
                    await result.current.pushState([1], 1);
                });

                expect(result.current.syncUnavailable).toBe(true);
            }
        );

        it('should treat a 409 stale-write answer as healthy sync', async () => {
            fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
                if (init?.method === 'POST') {
                    return { ok: false, status: 409, json: async () => ({ error: 'Stale update' }) };
                }
                return { ok: true, status: 200, json: async () => serverState };
            });

            const { result } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN });

            await act(async () => {
                await result.current.pushState([1], 1);
            });

            expect(result.current.syncUnavailable).toBe(false);
        });

        it('should report sync as unavailable when the server has no storage', async () => {
            fetchMock.mockImplementation(async () => ({
                ok: false,
                status: 503,
                json: async () => ({ error: 'Sync storage is not configured' }),
            }));

            const { result } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN });

            await act(async () => {
                await result.current.pushState([1], 1);
            });

            expect(result.current.syncUnavailable).toBe(true);
        });
    });

    describe('taking over the session on load', () => {
        it('should rotate the token on mount and use the new one for writes', async () => {
            const { result, callbacks } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN, isHost: true });

            await waitFor(() => expect(rotations).toHaveLength(1));

            expect(rotations[0].token).toBe(HOST_TOKEN);
            const nextToken = rotations[0].body.rotateToken as string;
            expect(nextToken).not.toBe(HOST_TOKEN);
            expect(callbacks.onTokenRotated).toHaveBeenCalledWith(nextToken);

            await act(async () => {
                await result.current.pushState([7], 7);
            });

            expect(posts.at(-1)?.token).toBe(nextToken);
        });

        it('should rotate when the seed and token arrive after mount', async () => {
            // The real load order: the hook mounts before the URL is read, then
            // page.tsx supplies seed and token together. Mounting with them
            // already present - as the other tests do - never exercises this.
            const { rerender, callbacks } = renderSync({ seed: null, hostToken: null });

            await new Promise(resolve => setTimeout(resolve, 20));
            expect(rotations).toHaveLength(0);

            rerender({ seed: 'seedA', hostToken: HOST_TOKEN, enabled: true });

            await waitFor(() => expect(rotations).toHaveLength(1));
            expect(rotations[0].token).toBe(HOST_TOKEN);
            expect(callbacks.onTokenRotated).toHaveBeenCalled();
        });

        it('should still rotate when the token arrives a render after the seed', async () => {
            // Defence in depth: even if a caller delivers them separately, the
            // session must not go unclaimed.
            const { rerender } = renderSync({ seed: null, hostToken: null });

            rerender({ seed: 'seedA', hostToken: null, enabled: true });
            await new Promise(resolve => setTimeout(resolve, 20));
            expect(rotations).toHaveLength(0);

            rerender({ seed: 'seedA', hostToken: HOST_TOKEN, enabled: true });

            await waitFor(() => expect(rotations).toHaveLength(1));
        });

        it('should rotate only once', async () => {
            const { rerender } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN });

            await waitFor(() => expect(rotations).toHaveLength(1));

            rerender({ seed: 'seedA', hostToken: rotations[0].body.rotateToken as string });
            await new Promise(resolve => setTimeout(resolve, 30));

            expect(rotations).toHaveLength(1);
        });

        it('should not rotate a session this tab just created', async () => {
            // claimSession mints the token here, so no other tab can hold it.
            // Rotating would race the initial claim and could lock the creator
            // out of the game it just started.
            const { result, rerender } = renderSync({ seed: null, hostToken: null });

            act(() => {
                result.current.claimSession('freshSeed', HOST_TOKEN);
            });
            rerender({ seed: 'freshSeed', hostToken: HOST_TOKEN, enabled: true });

            await new Promise(resolve => setTimeout(resolve, 40));

            expect(rotations).toHaveLength(0);
        });

        it('should retry a refused write with a rotation whose answer was lost', async () => {
            // The rotation committed server-side but the response never arrived,
            // so this tab still holds the old token. A 403 here is not a takeover.
            let rotationToken: string | undefined;
            fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
                if (init?.method !== 'POST') {
                    return { ok: true, status: 200, json: async () => serverState };
                }
                const headers = (init.headers ?? {}) as Record<string, string>;
                const body = JSON.parse(init.body as string);
                const token = headers['x-host-token'];

                if (body.rotateToken !== undefined) {
                    rotationToken = body.rotateToken;
                    rotations.push({ seed: 'seedA', body, token: token ?? null });
                    // Committed, but the client never learns the outcome
                    throw new DOMException('Aborted', 'AbortError');
                }

                if (token !== rotationToken) {
                    return { ok: false, status: 403, json: async () => ({ error: 'Not the session host' }) };
                }
                posts.push({ seed: 'seedA', body, token: token ?? null });
                return { ok: true, status: 200, json: async () => ({ ok: true, lastUpdate: Date.now() }) };
            });

            const { result, callbacks } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN, isHost: true });
            await waitFor(() => expect(rotations).toHaveLength(1));

            await act(async () => {
                await result.current.pushState([5], 5);
            });

            // Recovered rather than demoting the only host
            expect(posts).toHaveLength(1);
            expect(callbacks.onHostRoleLost).not.toHaveBeenCalled();
            expect(callbacks.onTokenRotated).toHaveBeenCalledWith(rotationToken);
        });

        it('should not rotate when there is no session yet', async () => {
            renderSync({ seed: null, hostToken: null });

            await new Promise(resolve => setTimeout(resolve, 40));

            expect(rotations).toHaveLength(0);
        });

        it('should not rotate as a guest', async () => {
            renderSync({ seed: 'seedA', hostToken: null, isHost: false });

            await new Promise(resolve => setTimeout(resolve, 40));

            expect(rotations).toHaveLength(0);
        });

        it('should step down when another tab already took the session over', async () => {
            fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
                if (init?.method === 'POST') {
                    return { ok: false, status: 403, json: async () => ({ error: 'Not the session host' }) };
                }
                return { ok: true, status: 200, json: async () => serverState };
            });

            const { callbacks } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN, isHost: true });

            await waitFor(() => expect(callbacks.onHostRoleLost).toHaveBeenCalled());
        });

        it('should step down when a later write is refused', async () => {
            let refuse = false;
            const original = fetchMock.getMockImplementation()!;
            fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
                const body = init?.body ? JSON.parse(init.body as string) : {};
                if (refuse && init?.method === 'POST' && body.rotateToken === undefined) {
                    return { ok: false, status: 403, json: async () => ({ error: 'Not the session host' }) };
                }
                return original(url, init);
            });

            const { result, callbacks } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN, isHost: true });
            await waitFor(() => expect(rotations).toHaveLength(1));

            refuse = true;
            await act(async () => {
                await result.current.pushState([3], 3);
            });

            expect(callbacks.onHostRoleLost).toHaveBeenCalled();
            // A takeover is not a sync outage - do not show the generic warning
            expect(result.current.syncUnavailable).toBe(false);
        });
    });

    describe('broadcasts between tabs', () => {
        it('should ignore a peer broadcast while acting as host', async () => {
            const { callbacks } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN, isHost: true });
            await waitFor(() => expect(rotations).toHaveLength(1));

            // A tab that has just been rotated out still broadcasts before its
            // write is refused; the real host must not take state from it.
            const channel = new BroadcastChannel('zahlenlotto-seedA');
            await act(async () => {
                channel.postMessage({
                    type: 'NUMBER_DRAWN',
                    seed: 'seedA',
                    drawnNumbers: [77],
                    currentNumber: 77,
                });
                await new Promise(resolve => setTimeout(resolve, 30));
            });
            channel.close();

            expect(callbacks.onStateUpdate).not.toHaveBeenCalledWith([77], 77);
        });

        it('should accept a peer broadcast as a guest', async () => {
            const { callbacks } = renderSync({ seed: 'seedB', hostToken: null, isHost: false });

            const channel = new BroadcastChannel('zahlenlotto-seedB');
            await act(async () => {
                channel.postMessage({
                    type: 'NUMBER_DRAWN',
                    seed: 'seedB',
                    drawnNumbers: [12],
                    currentNumber: 12,
                });
                await new Promise(resolve => setTimeout(resolve, 30));
            });
            channel.close();

            expect(callbacks.onStateUpdate).toHaveBeenCalledWith([12], 12);
        });
    });

    describe('guest polling', () => {
        it('should apply drawn numbers from the server', async () => {
            serverState = { drawnNumbers: [1, 2, 3], currentNumber: 3, lastUpdate: 1000 };

            const { callbacks } = renderSync({ seed: 'seedA', isHost: false });

            await waitFor(() => {
                expect(callbacks.onStateUpdate).toHaveBeenCalledWith([1, 2, 3], 3);
            });
        });

        it('should not reset when the server holds no state yet', async () => {
            // A guest who restored numbers from the share URL must keep them
            // while the server has nothing stored (lastUpdate: 0).
            serverState = { drawnNumbers: [], currentNumber: null, lastUpdate: 0 };

            const { callbacks } = renderSync({ seed: 'seedA', isHost: false });

            await waitFor(() => {
                expect(fetchMock).toHaveBeenCalled();
            });

            expect(callbacks.onReset).not.toHaveBeenCalled();
            expect(callbacks.onStateUpdate).not.toHaveBeenCalled();
        });

        it('should apply a host reset that arrives as an empty timestamped state', async () => {
            serverState = { drawnNumbers: [1, 2], currentNumber: 2, lastUpdate: 1000 };

            const { callbacks } = renderSync({ seed: 'seedA', isHost: false });

            await waitFor(() => {
                expect(callbacks.onStateUpdate).toHaveBeenCalledWith([1, 2], 2);
            });

            serverState = { drawnNumbers: [], currentNumber: null, lastUpdate: 2000 };

            await waitFor(() => {
                expect(callbacks.onReset).toHaveBeenCalled();
            });
        });

        it('should apply card config once the host generates cards', async () => {
            serverState = { drawnNumbers: [5], currentNumber: 5, lastUpdate: 1000 };

            const { callbacks } = renderSync({ seed: 'seedA', isHost: false });

            await waitFor(() => {
                expect(callbacks.onStateUpdate).toHaveBeenCalled();
            });
            expect(callbacks.onCardConfigUpdate).not.toHaveBeenCalled();

            serverState = {
                drawnNumbers: [5],
                currentNumber: 5,
                lastUpdate: 2000,
                numberOfPlayers: 2,
                cardsPerPlayer: 3,
                playerNames: ['Alice', 'Bob'],
            };

            await waitFor(() => {
                expect(callbacks.onCardConfigUpdate).toHaveBeenCalledWith({
                    numberOfPlayers: 2,
                    cardsPerPlayer: 3,
                    playerNames: ['Alice', 'Bob'],
                });
            });
        });

        it('should apply an unchanged card config only once', async () => {
            serverState = {
                drawnNumbers: [1],
                currentNumber: 1,
                lastUpdate: 1000,
                numberOfPlayers: 2,
                cardsPerPlayer: 3,
                playerNames: ['Alice', 'Bob'],
            };

            const { callbacks } = renderSync({ seed: 'seedA', isHost: false });

            await waitFor(() => {
                expect(callbacks.onCardConfigUpdate).toHaveBeenCalledTimes(1);
            });

            serverState = { ...serverState, drawnNumbers: [1, 2], currentNumber: 2, lastUpdate: 2000 };

            await waitFor(() => {
                expect(callbacks.onStateUpdate).toHaveBeenCalledWith([1, 2], 2);
            });
            expect(callbacks.onCardConfigUpdate).toHaveBeenCalledTimes(1);
        });

        it.each([500, 503, 404])(
            'should warn a guest when polling fails with %i',
            async (status) => {
                fetchMock.mockImplementation(async () => ({
                    ok: false,
                    status,
                    json: async () => ({ error: 'nope' }),
                }));

                const { result } = renderSync({ seed: 'seedA', isHost: false });

                await waitFor(() => {
                    expect(result.current.syncUnavailable).toBe(true);
                });
            }
        );

        it('should warn a guest when polling throws', async () => {
            fetchMock.mockImplementation(async () => {
                throw new TypeError('network down');
            });

            const { result } = renderSync({ seed: 'seedA', isHost: false });

            await waitFor(() => {
                expect(result.current.syncUnavailable).toBe(true);
            });
        });

        it('should clear the warning once polling recovers', async () => {
            let failing = true;
            const original = fetchMock.getMockImplementation()!;
            fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
                if (failing) return { ok: false, status: 500, json: async () => ({}) };
                return original(url, init);
            });

            const { result } = renderSync({ seed: 'seedA', isHost: false });

            await waitFor(() => expect(result.current.syncUnavailable).toBe(true));

            failing = false;
            await waitFor(() => expect(result.current.syncUnavailable).toBe(false));
        });

        it('should not poll repeatedly as a host', async () => {
            renderSync({ seed: 'seedA', hostToken: HOST_TOKEN, isHost: true });

            await new Promise(resolve => setTimeout(resolve, 60));

            // Exactly one read: the mount-time hydrate, never the polling loop
            const reads = fetchMock.mock.calls.filter(([, init]) => init?.method !== 'POST');
            expect(reads).toHaveLength(1);
        });
    });

    describe('host resuming after a refresh', () => {
        it('should load the stored session on mount', async () => {
            serverState = {
                drawnNumbers: [4, 8, 15],
                currentNumber: 15,
                lastUpdate: 1000,
                numberOfPlayers: 2,
                cardsPerPlayer: 3,
                playerNames: ['Alice', 'Bob'],
            };

            const { callbacks } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN, isHost: true });

            await waitFor(() => {
                expect(callbacks.onStateUpdate).toHaveBeenCalledWith([4, 8, 15], 15);
            });
            expect(callbacks.onCardConfigUpdate).toHaveBeenCalledWith({
                numberOfPlayers: 2,
                cardsPerPlayer: 3,
                playerNames: ['Alice', 'Bob'],
            });
        });

        it('should not resurrect anything when the server has no state', async () => {
            serverState = { drawnNumbers: [], currentNumber: null, lastUpdate: 0 };

            const { callbacks } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN, isHost: true });

            await waitFor(() => expect(fetchMock).toHaveBeenCalled());

            expect(callbacks.onStateUpdate).not.toHaveBeenCalled();
            expect(callbacks.onReset).not.toHaveBeenCalled();
        });

        it('should release the host if the read never answers', async () => {
            // An unreachable API must degrade to local play, not lock the host
            // out of drawing until the browser's own timeout expires.
            fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
                new Promise((_resolve, reject) => {
                    init?.signal?.addEventListener('abort', () =>
                        reject(new DOMException('Aborted', 'AbortError'))
                    );
                })
            );

            const { result } = renderSync({
                seed: 'seedA',
                hostToken: HOST_TOKEN,
                isHost: true,
                hydrateTimeout: 20,
            });

            expect(result.current.isHydrating).toBe(true);

            await waitFor(() => {
                expect(result.current.isHydrating).toBe(false);
            });
        });

        it('should apply a recorded reset instead of stale share-URL numbers', async () => {
            // Host reopens an old full share link after the session was reset:
            // the server's empty-but-timestamped state must win.
            serverState = { drawnNumbers: [], currentNumber: null, lastUpdate: 5000 };

            const { callbacks } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN, isHost: true });

            await waitFor(() => {
                expect(callbacks.onReset).toHaveBeenCalled();
            });
            expect(callbacks.onStateUpdate).not.toHaveBeenCalled();
        });

        it('should not apply the read once a draw has been queued, even before it responds', async () => {
            serverState = { drawnNumbers: [1, 2], currentNumber: 2, lastUpdate: 1000 };

            // Hold both the read and the write open, then let the read answer
            // first: the POST has been queued but has not come back yet.
            let releaseRead: (() => void) | undefined;
            let releaseWrite: (() => void) | undefined;
            const original = fetchMock.getMockImplementation()!;
            fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
                if (init?.method === 'POST') {
                    await new Promise<void>(resolve => { releaseWrite = resolve; });
                } else {
                    await new Promise<void>(resolve => { releaseRead = resolve; });
                }
                return original(url, init);
            });

            const { result, callbacks } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN, isHost: true });

            await act(async () => {
                const push = result.current.pushState([9], 9);
                await new Promise(resolve => setTimeout(resolve, 10));

                releaseRead?.();
                await new Promise(resolve => setTimeout(resolve, 10));

                releaseWrite?.();
                await push;
            });

            expect(callbacks.onStateUpdate).not.toHaveBeenCalled();
            expect(callbacks.onReset).not.toHaveBeenCalled();
        });

        it('should never undo a draw the host made while the hydrate was in flight', async () => {
            serverState = { drawnNumbers: [1, 2], currentNumber: 2, lastUpdate: 1000 };

            // Hold the mount-time read open so the host can draw underneath it
            let releaseRead: (() => void) | undefined;
            const original = fetchMock.getMockImplementation()!;
            fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
                if (init?.method !== 'POST') {
                    await new Promise<void>(resolve => { releaseRead = resolve; });
                }
                return original(url, init);
            });

            const { result, callbacks } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN, isHost: true });

            await act(async () => {
                await result.current.pushState([9], 9);
                releaseRead?.();
                await new Promise(resolve => setTimeout(resolve, 30));
            });

            // The stale read must not drag the host back to the old numbers
            expect(callbacks.onStateUpdate).not.toHaveBeenCalled();
            expect(posts.at(-1)?.body.drawnNumbers).toEqual([9]);
        });
    });

    describe('ordering of overlapping host writes', () => {
        it('should stamp each write with a strictly increasing sequence', async () => {
            const { result } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN });

            await act(async () => {
                await result.current.pushState([1], 1);
                await result.current.pushState([1, 2], 2);
                await result.current.resetState();
            });

            const seqs = posts.map(p => p.body.clientSeq as number);
            expect(seqs).toHaveLength(3);
            expect(seqs[1]).toBeGreaterThan(seqs[0]);
            expect(seqs[2]).toBeGreaterThan(seqs[1]);
        });

        it('should send a slow draw and a following reset in order', async () => {
            // Make the first POST hang so the reset would overtake it if the
            // writes were not chained.
            let releaseFirst: (() => void) | undefined;
            const original = fetchMock.getMockImplementation()!;
            let postCount = 0;

            fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
                // Only stall the first *state* write; rotation POSTs pass through
                const isStateWrite =
                    init?.method === 'POST' &&
                    JSON.parse((init.body as string) ?? '{}').rotateToken === undefined;
                if (isStateWrite && ++postCount === 1) {
                    await new Promise<void>(resolve => { releaseFirst = resolve; });
                }
                return original(url, init);
            });

            const { result } = renderSync({ seed: 'seedA', hostToken: HOST_TOKEN });

            let draw: Promise<void> | undefined;
            let reset: Promise<void> | undefined;
            await act(async () => {
                draw = result.current.pushState([7], 7);
                reset = result.current.resetState();
                await new Promise(resolve => setTimeout(resolve, 20));
                // The reset must not have been sent while the draw is in flight
                expect(posts).toHaveLength(0);
                releaseFirst?.();
                await Promise.all([draw, reset]);
            });

            expect(posts.map(p => p.body.drawnNumbers)).toEqual([[7], []]);
        });
    });
});
