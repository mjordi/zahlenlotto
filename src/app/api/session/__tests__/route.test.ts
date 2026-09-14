/**
 * Tests for the session API route.
 * Tests the core logic using mocks since Next.js Web APIs aren't available in Jest.
 */

// Replace NextResponse for tests - the factory must be self-contained (hoisted)
jest.mock('next/server', () => ({
    NextResponse: {
        json: (data: unknown, init?: { status?: number }) => ({
            status: init?.status || 200,
            json: async () => data,
        }),
    },
}));

// Import the route after mocks are set up
import { GET, POST } from '../[seed]/route';

const HOST_TOKEN = 'host-token-for-tests-0123456789';
const OTHER_TOKEN = 'another-token-entirely-987654321';

// Helper to create params
function createParams(seed: string): { params: Promise<{ seed: string }> } {
    return { params: Promise.resolve({ seed }) };
}

/** Minimal request stand-in: the route only uses json() and headers.get(). */
function createMockRequest(body?: object, headers: Record<string, string> = {}) {
    return {
        json: async () => body || {},
        headers: {
            get: (name: string) => headers[name.toLowerCase()] ?? null,
        },
    };
}

function hostRequest(body?: object, token: string = HOST_TOKEN) {
    return createMockRequest(body, { 'x-host-token': token });
}

async function getState(seed: string) {
    const response = await GET(createMockRequest() as never, createParams(seed));
    return response.json();
}

describe('Session API Route', () => {
    describe('GET /api/session/[seed]', () => {
        it('should return empty state for new session', async () => {
            const response = await GET(createMockRequest() as never, createParams('newSeed123'));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.drawnNumbers).toEqual([]);
            expect(data.currentNumber).toBeNull();
            expect(data.lastUpdate).toBe(0);
        });

        it('should return 400 for invalid seed (too short)', async () => {
            const response = await GET(createMockRequest() as never, createParams('abc'));

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Invalid seed');
        });

        it('should never expose the host token', async () => {
            const seed = 'tokenLeakTest';
            await POST(hostRequest({ drawnNumbers: [7], currentNumber: 7 }) as never, createParams(seed));

            const data = await getState(seed);
            expect(data.hostToken).toBeUndefined();
        });
    });

    describe('POST /api/session/[seed]', () => {
        it('should save game state', async () => {
            const seed = 'postTest123';
            const postResponse = await POST(
                hostRequest({ drawnNumbers: [1, 42, 88], currentNumber: 88 }) as never,
                createParams(seed)
            );

            expect(postResponse.status).toBe(200);
            const postData = await postResponse.json();
            expect(postData.ok).toBe(true);
            expect(postData.lastUpdate).toBeGreaterThan(0);

            const getData = await getState(seed);
            expect(getData.drawnNumbers).toEqual([1, 42, 88]);
            expect(getData.currentNumber).toBe(88);
        });

        it('should return 400 for invalid request body', async () => {
            const response = await POST(
                hostRequest({ invalid: 'data' }) as never,
                createParams('test456')
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Invalid request body');
        });

        it('should return 400 for invalid drawn numbers (out of range)', async () => {
            const response = await POST(
                hostRequest({ drawnNumbers: [0, 91], currentNumber: null }) as never,
                createParams('test789')
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Invalid drawn numbers');
        });

        it('should return 400 for short seed', async () => {
            const response = await POST(
                hostRequest({ drawnNumbers: [1], currentNumber: 1 }) as never,
                createParams('ab')
            );

            expect(response.status).toBe(400);
        });
    });

    describe('Host authorization', () => {
        it('should reject writes without a host token', async () => {
            const response = await POST(
                createMockRequest({ drawnNumbers: [1], currentNumber: 1 }) as never,
                createParams('noTokenSession')
            );

            expect(response.status).toBe(401);
            const data = await response.json();
            expect(data.error).toBe('Missing host token');
        });

        it('should reject a token that is too short to be a real secret', async () => {
            const response = await POST(
                hostRequest({ drawnNumbers: [1], currentNumber: 1 }, 'short') as never,
                createParams('shortTokenSession')
            );

            expect(response.status).toBe(401);
        });

        it('should reject writes from a guest who did not claim the session', async () => {
            const seed = 'claimedSession1';

            // Host claims the session
            await POST(
                hostRequest({ drawnNumbers: [1], currentNumber: 1 }) as never,
                createParams(seed)
            );

            // Someone else with the share link tries to forge a draw
            const forged = await POST(
                hostRequest({ drawnNumbers: [1, 2, 3], currentNumber: 3 }, OTHER_TOKEN) as never,
                createParams(seed)
            );

            expect(forged.status).toBe(403);
            const data = await forged.json();
            expect(data.error).toBe('Not the session host');

            // State is untouched
            const state = await getState(seed);
            expect(state.drawnNumbers).toEqual([1]);
        });

        it('should allow the claiming host to keep writing', async () => {
            const seed = 'claimedSession2';

            await POST(hostRequest({ drawnNumbers: [1], currentNumber: 1 }) as never, createParams(seed));
            const second = await POST(
                hostRequest({ drawnNumbers: [1, 2], currentNumber: 2 }) as never,
                createParams(seed)
            );

            expect(second.status).toBe(200);
            const state = await getState(seed);
            expect(state.drawnNumbers).toEqual([1, 2]);
        });
    });

    describe('Card configuration sync', () => {
        it('should save and return card configuration', async () => {
            const seed = 'cardConfig123';
            const postResponse = await POST(
                hostRequest({
                    drawnNumbers: [1, 2, 3],
                    currentNumber: 3,
                    numberOfPlayers: 2,
                    cardsPerPlayer: 3,
                    playerNames: ['Alice', 'Bob'],
                }) as never,
                createParams(seed)
            );
            expect(postResponse.status).toBe(200);

            const getData = await getState(seed);
            expect(getData.numberOfPlayers).toBe(2);
            expect(getData.cardsPerPlayer).toBe(3);
            expect(getData.playerNames).toEqual(['Alice', 'Bob']);
        });

        it('should preserve card configuration across plain draw updates', async () => {
            const seed = 'cardConfigPersist';

            await POST(
                hostRequest({
                    drawnNumbers: [],
                    currentNumber: null,
                    numberOfPlayers: 2,
                    cardsPerPlayer: 3,
                    playerNames: ['Alice', 'Bob'],
                }) as never,
                createParams(seed)
            );

            // A later draw carries no card config - it must not wipe the stored one
            await POST(
                hostRequest({ drawnNumbers: [7], currentNumber: 7 }) as never,
                createParams(seed)
            );

            const state = await getState(seed);
            expect(state.drawnNumbers).toEqual([7]);
            expect(state.numberOfPlayers).toBe(2);
            expect(state.cardsPerPlayer).toBe(3);
            expect(state.playerNames).toEqual(['Alice', 'Bob']);
        });

        it('should validate numberOfPlayers range', async () => {
            const seed = 'cardConfigRange1';
            await POST(
                hostRequest({
                    drawnNumbers: [1],
                    currentNumber: 1,
                    numberOfPlayers: 0,
                    cardsPerPlayer: 3,
                }) as never,
                createParams(seed)
            );

            const state = await getState(seed);
            expect(state.numberOfPlayers).toBeUndefined();
        });

        it('should validate cardsPerPlayer range', async () => {
            const seed = 'cardConfigRange2';
            await POST(
                hostRequest({
                    drawnNumbers: [1],
                    currentNumber: 1,
                    numberOfPlayers: 2,
                    cardsPerPlayer: 15,
                }) as never,
                createParams(seed)
            );

            const state = await getState(seed);
            expect(state.numberOfPlayers).toBe(2);
            expect(state.cardsPerPlayer).toBeUndefined();
        });
    });

    describe('Reset propagation', () => {
        it('should store a reset as an empty but freshly timestamped state', async () => {
            const seed = 'resetSession123';

            const first = await POST(
                hostRequest({ drawnNumbers: [1, 2, 3], currentNumber: 3 }) as never,
                createParams(seed)
            );
            const firstUpdate = (await first.json()).lastUpdate;

            const reset = await POST(
                hostRequest({ drawnNumbers: [], currentNumber: null }) as never,
                createParams(seed)
            );
            expect(reset.status).toBe(200);

            const state = await getState(seed);
            expect(state.drawnNumbers).toEqual([]);
            expect(state.currentNumber).toBeNull();
            // A guest detects the reset by the timestamp moving forward,
            // which a deleted key (lastUpdate: 0) would never do.
            expect(state.lastUpdate).toBeGreaterThanOrEqual(firstUpdate);
            expect(state.lastUpdate).toBeGreaterThan(0);
        });

        it('should keep generated cards through a reset', async () => {
            const seed = 'resetKeepsCards';

            await POST(
                hostRequest({
                    drawnNumbers: [5],
                    currentNumber: 5,
                    numberOfPlayers: 3,
                    cardsPerPlayer: 2,
                    playerNames: ['A', 'B', 'C'],
                }) as never,
                createParams(seed)
            );

            await POST(
                hostRequest({ drawnNumbers: [], currentNumber: null }) as never,
                createParams(seed)
            );

            const state = await getState(seed);
            expect(state.drawnNumbers).toEqual([]);
            expect(state.numberOfPlayers).toBe(3);
            expect(state.playerNames).toEqual(['A', 'B', 'C']);
        });
    });

    describe('State persistence', () => {
        it('should update existing state', async () => {
            const seed = 'updateTest123';

            await POST(hostRequest({ drawnNumbers: [1], currentNumber: 1 }) as never, createParams(seed));
            await POST(
                hostRequest({ drawnNumbers: [1, 2, 3], currentNumber: 3 }) as never,
                createParams(seed)
            );

            const state = await getState(seed);
            expect(state.drawnNumbers).toEqual([1, 2, 3]);
            expect(state.currentNumber).toBe(3);
        });
    });
});
