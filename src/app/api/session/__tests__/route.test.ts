/**
 * Tests for the session API route.
 * Tests the core logic using mocks since Next.js Web APIs aren't available in Jest.
 */

// Mock fetch for the API
global.fetch = jest.fn();

// Replace NextRequest globally for tests - mock must be defined inline
jest.mock('next/server', () => {
    class MockNextRequest {
        private _body: string | undefined;
        private _method: string;

        constructor(url: string | URL, init?: { method?: string; body?: string }) {
            this._method = init?.method || 'GET';
            this._body = init?.body;
        }

        async json() {
            return this._body ? JSON.parse(this._body) : {};
        }
    }

    return {
        NextRequest: MockNextRequest,
        NextResponse: {
            json: (data: unknown, init?: { status?: number }) => ({
                status: init?.status || 200,
                json: async () => data,
            }),
        },
    };
});

// Import the route after mocks are set up
import { GET, POST, DELETE } from '../[seed]/route';

// Helper to create params
function createParams(seed: string): { params: Promise<{ seed: string }> } {
    return { params: Promise.resolve({ seed }) };
}

// Mock request helper - creates object with json method
function createMockRequest(body?: object) {
    return {
        json: async () => body || {},
    };
}

describe('Session API Route', () => {
    beforeEach(() => {
        // Clear any cached state between tests
        jest.clearAllMocks();
    });

    describe('GET /api/session/[seed]', () => {
        it('should return empty state for new session', async () => {
            const request = createMockRequest();
            const response = await GET(request as never, createParams('newSeed123'));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.drawnNumbers).toEqual([]);
            expect(data.currentNumber).toBeNull();
            expect(data.lastUpdate).toBe(0);
        });

        it('should return 400 for invalid seed (too short)', async () => {
            const request = createMockRequest();
            const response = await GET(request as never, createParams('abc'));

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Invalid seed');
        });
    });

    describe('POST /api/session/[seed]', () => {
        it('should save game state', async () => {
            const seed = 'postTest123';
            const postRequest = createMockRequest({
                drawnNumbers: [1, 42, 88],
                currentNumber: 88,
            });

            const postResponse = await POST(postRequest as never, createParams(seed));
            expect(postResponse.status).toBe(200);
            const postData = await postResponse.json();
            expect(postData.ok).toBe(true);
            expect(postData.lastUpdate).toBeGreaterThan(0);

            // Verify saved state with GET
            const getRequest = createMockRequest();
            const getResponse = await GET(getRequest as never, createParams(seed));
            const getData = await getResponse.json();

            expect(getData.drawnNumbers).toEqual([1, 42, 88]);
            expect(getData.currentNumber).toBe(88);
        });

        it('should return 400 for invalid request body', async () => {
            const request = createMockRequest({ invalid: 'data' });

            const response = await POST(request as never, createParams('test456'));
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Invalid request body');
        });

        it('should return 400 for invalid drawn numbers (out of range)', async () => {
            const request = createMockRequest({
                drawnNumbers: [0, 91],
                currentNumber: null,
            });

            const response = await POST(request as never, createParams('test789'));
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Invalid drawn numbers');
        });

        it('should return 400 for short seed', async () => {
            const request = createMockRequest({ drawnNumbers: [1], currentNumber: 1 });

            const response = await POST(request as never, createParams('ab'));
            expect(response.status).toBe(400);
        });
    });

    describe('DELETE /api/session/[seed]', () => {
        it('should delete game state', async () => {
            const seed = 'deleteTest123';

            // First create a session
            const postRequest = createMockRequest({
                drawnNumbers: [1, 2, 3],
                currentNumber: 3,
            });
            await POST(postRequest as never, createParams(seed));

            // Delete it
            const deleteRequest = createMockRequest();
            const deleteResponse = await DELETE(deleteRequest as never, createParams(seed));
            expect(deleteResponse.status).toBe(200);
            const deleteData = await deleteResponse.json();
            expect(deleteData.ok).toBe(true);

            // Verify it's deleted (returns empty state)
            const getRequest = createMockRequest();
            const getResponse = await GET(getRequest as never, createParams(seed));
            const getData = await getResponse.json();

            expect(getData.drawnNumbers).toEqual([]);
        });

        it('should return 400 for invalid seed', async () => {
            const request = createMockRequest();
            const response = await DELETE(request as never, createParams('xy'));

            expect(response.status).toBe(400);
        });
    });

    describe('State persistence', () => {
        it('should update existing state', async () => {
            const seed = 'updateTest123';

            // Create initial state
            const request1 = createMockRequest({
                drawnNumbers: [1],
                currentNumber: 1,
            });
            await POST(request1 as never, createParams(seed));

            // Update state
            const request2 = createMockRequest({
                drawnNumbers: [1, 2, 3],
                currentNumber: 3,
            });
            await POST(request2 as never, createParams(seed));

            // Verify updated state
            const getRequest = createMockRequest();
            const response = await GET(getRequest as never, createParams(seed));
            const data = await response.json();

            expect(data.drawnNumbers).toEqual([1, 2, 3]);
            expect(data.currentNumber).toBe(3);
        });
    });

    describe('Card configuration sync', () => {
        it('should save and return card configuration', async () => {
            const seed = 'cardConfig123';
            const postRequest = createMockRequest({
                drawnNumbers: [1, 2, 3],
                currentNumber: 3,
                numberOfPlayers: 2,
                cardsPerPlayer: 3,
                playerNames: ['Alice', 'Bob'],
            });

            const postResponse = await POST(postRequest as never, createParams(seed));
            expect(postResponse.status).toBe(200);

            // Verify card config is returned with GET
            const getRequest = createMockRequest();
            const getResponse = await GET(getRequest as never, createParams(seed));
            const getData = await getResponse.json();

            expect(getData.numberOfPlayers).toBe(2);
            expect(getData.cardsPerPlayer).toBe(3);
            expect(getData.playerNames).toEqual(['Alice', 'Bob']);
        });

        it('should validate numberOfPlayers range', async () => {
            const seed = 'cardConfigRange1';
            // numberOfPlayers = 0 should be ignored
            const postRequest = createMockRequest({
                drawnNumbers: [1],
                currentNumber: 1,
                numberOfPlayers: 0,
                cardsPerPlayer: 3,
            });

            await POST(postRequest as never, createParams(seed));

            const getRequest = createMockRequest();
            const getResponse = await GET(getRequest as never, createParams(seed));
            const getData = await getResponse.json();

            expect(getData.numberOfPlayers).toBeUndefined();
        });

        it('should validate cardsPerPlayer range', async () => {
            const seed = 'cardConfigRange2';
            // cardsPerPlayer = 15 should be ignored (max is 10)
            const postRequest = createMockRequest({
                drawnNumbers: [1],
                currentNumber: 1,
                numberOfPlayers: 2,
                cardsPerPlayer: 15,
            });

            await POST(postRequest as never, createParams(seed));

            const getRequest = createMockRequest();
            const getResponse = await GET(getRequest as never, createParams(seed));
            const getData = await getResponse.json();

            expect(getData.numberOfPlayers).toBe(2);
            expect(getData.cardsPerPlayer).toBeUndefined();
        });
    });
});
