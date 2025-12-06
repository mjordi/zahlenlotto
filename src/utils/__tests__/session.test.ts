import {
    generateSessionSeed,
    generateLottoCardWithSeed,
    encodeSessionToParams,
    decodeSessionFromParams,
    createShareableUrl,
    SessionData,
} from '../session';

describe('session utilities', () => {
    describe('generateSessionSeed', () => {
        it('should generate an 8-character seed', () => {
            const seed = generateSessionSeed();
            expect(seed).toHaveLength(8);
        });

        it('should only contain alphanumeric characters', () => {
            const seed = generateSessionSeed();
            expect(seed).toMatch(/^[A-Za-z0-9]+$/);
        });

        it('should generate different seeds on consecutive calls', () => {
            const seeds = new Set<string>();
            for (let i = 0; i < 100; i++) {
                seeds.add(generateSessionSeed());
            }
            // With 100 tries and 62^8 possibilities, collisions are extremely unlikely
            expect(seeds.size).toBeGreaterThan(95);
        });
    });

    describe('generateLottoCardWithSeed', () => {
        it('should generate a 3x9 grid', () => {
            const card = generateLottoCardWithSeed('testSeed', 1);
            expect(card).toHaveLength(3);
            card.forEach(row => {
                expect(row).toHaveLength(9);
            });
        });

        it('should have exactly 5 numbers per row', () => {
            const card = generateLottoCardWithSeed('testSeed', 1);
            card.forEach(row => {
                const numbersInRow = row.filter(cell => cell !== null);
                expect(numbersInRow).toHaveLength(5);
            });
        });

        it('should have exactly 15 total numbers', () => {
            const card = generateLottoCardWithSeed('testSeed', 1);
            const allNumbers = card.flat().filter(cell => cell !== null);
            expect(allNumbers).toHaveLength(15);
        });

        it('should generate the same card for the same seed and index', () => {
            const card1 = generateLottoCardWithSeed('mySeed123', 1);
            const card2 = generateLottoCardWithSeed('mySeed123', 1);
            expect(card1).toEqual(card2);
        });

        it('should generate different cards for different indices with same seed', () => {
            const card1 = generateLottoCardWithSeed('mySeed123', 1);
            const card2 = generateLottoCardWithSeed('mySeed123', 2);
            expect(card1).not.toEqual(card2);
        });

        it('should generate different cards for different seeds with same index', () => {
            const card1 = generateLottoCardWithSeed('seedA', 1);
            const card2 = generateLottoCardWithSeed('seedB', 1);
            expect(card1).not.toEqual(card2);
        });

        it('should have numbers in correct column ranges', () => {
            const card = generateLottoCardWithSeed('columnTest', 1);
            const columnRanges = [
                [1, 9],    // Col 0
                [10, 19],  // Col 1
                [20, 29],  // Col 2
                [30, 39],  // Col 3
                [40, 49],  // Col 4
                [50, 59],  // Col 5
                [60, 69],  // Col 6
                [70, 79],  // Col 7
                [80, 90],  // Col 8
            ];

            for (let col = 0; col < 9; col++) {
                const [min, max] = columnRanges[col];
                for (let row = 0; row < 3; row++) {
                    const num = card[row][col];
                    if (num !== null) {
                        expect(num).toBeGreaterThanOrEqual(min);
                        expect(num).toBeLessThanOrEqual(max);
                    }
                }
            }
        });

        it('should have sorted numbers within each column', () => {
            const card = generateLottoCardWithSeed('sortTest', 1);
            for (let col = 0; col < 9; col++) {
                const colNumbers = card.map(row => row[col]).filter(n => n !== null) as number[];
                const sorted = [...colNumbers].sort((a, b) => a - b);
                expect(colNumbers).toEqual(sorted);
            }
        });

        it('should have all unique numbers', () => {
            const card = generateLottoCardWithSeed('uniqueTest', 1);
            const allNumbers = card.flat().filter(cell => cell !== null) as number[];
            const uniqueNumbers = new Set(allNumbers);
            expect(uniqueNumbers.size).toBe(allNumbers.length);
        });
    });

    describe('encodeSessionToParams', () => {
        it('should encode session data with cards', () => {
            const session: SessionData = {
                seed: 'abc123',
                drawnNumbers: [1, 42, 88],
                numberOfPlayers: 2,
                cardsPerPlayer: 3,
                playerNames: ['Alice', 'Bob'],
            };

            const params = encodeSessionToParams(session);
            expect(params.get('s')).toBe('abc123');
            expect(params.get('d')).toBe('1,42,88');
            expect(params.get('p')).toBe('2');
            expect(params.get('c')).toBe('3');
            expect(params.get('n')).toBe('Alice,Bob');
        });

        it('should encode draw-only session (no cards)', () => {
            const session: SessionData = {
                seed: 'drawOnly',
                drawnNumbers: [5, 10, 15],
            };

            const params = encodeSessionToParams(session);
            expect(params.get('s')).toBe('drawOnly');
            expect(params.get('d')).toBe('5,10,15');
            expect(params.has('p')).toBe(false);
            expect(params.has('c')).toBe(false);
        });

        it('should not include drawn numbers when empty', () => {
            const session: SessionData = {
                seed: 'noDrawn',
                drawnNumbers: [],
                numberOfPlayers: 2,
                cardsPerPlayer: 1,
            };

            const params = encodeSessionToParams(session);
            expect(params.has('d')).toBe(false);
        });

        it('should not include names param when all names are empty', () => {
            const session: SessionData = {
                seed: 'xyz789',
                drawnNumbers: [],
                numberOfPlayers: 2,
                cardsPerPlayer: 1,
                playerNames: ['', ''],
            };

            const params = encodeSessionToParams(session);
            expect(params.has('n')).toBe(false);
        });

        it('should only include non-empty names', () => {
            const session: SessionData = {
                seed: 'test123',
                drawnNumbers: [],
                numberOfPlayers: 3,
                cardsPerPlayer: 1,
                playerNames: ['Alice', '', 'Charlie'],
            };

            const params = encodeSessionToParams(session);
            expect(params.get('n')).toBe('Alice,Charlie');
        });
    });

    describe('decodeSessionFromParams', () => {
        it('should decode session with cards and drawn numbers', () => {
            const params = new URLSearchParams('s=abc123&d=1,42,88&p=2&c=3&n=Alice,Bob');
            const session = decodeSessionFromParams(params);

            expect(session).not.toBeNull();
            expect(session!.seed).toBe('abc123');
            expect(session!.drawnNumbers).toEqual([1, 42, 88]);
            expect(session!.numberOfPlayers).toBe(2);
            expect(session!.cardsPerPlayer).toBe(3);
            expect(session!.playerNames).toEqual(['Alice', 'Bob']);
        });

        it('should decode draw-only session (no cards)', () => {
            const params = new URLSearchParams('s=drawOnly&d=5,10,15');
            const session = decodeSessionFromParams(params);

            expect(session).not.toBeNull();
            expect(session!.seed).toBe('drawOnly');
            expect(session!.drawnNumbers).toEqual([5, 10, 15]);
            expect(session!.numberOfPlayers).toBeUndefined();
            expect(session!.cardsPerPlayer).toBeUndefined();
        });

        it('should decode session with no drawn numbers', () => {
            const params = new URLSearchParams('s=noDrawn&p=2&c=3');
            const session = decodeSessionFromParams(params);

            expect(session).not.toBeNull();
            expect(session!.drawnNumbers).toEqual([]);
        });

        it('should return null for missing seed', () => {
            const params = new URLSearchParams('p=2&c=3');
            expect(decodeSessionFromParams(params)).toBeNull();
        });

        it('should decode session without card config when only seed present', () => {
            const params = new URLSearchParams('s=seedOnly');
            const session = decodeSessionFromParams(params);

            expect(session).not.toBeNull();
            expect(session!.seed).toBe('seedOnly');
            expect(session!.drawnNumbers).toEqual([]);
            expect(session!.numberOfPlayers).toBeUndefined();
        });

        it('should ignore invalid drawn numbers', () => {
            const params = new URLSearchParams('s=test&d=1,invalid,42,0,91');
            const session = decodeSessionFromParams(params);

            expect(session).not.toBeNull();
            expect(session!.drawnNumbers).toEqual([1, 42]); // Only valid 1-90 numbers
        });

        it('should ignore card config if incomplete', () => {
            const params = new URLSearchParams('s=abc123&p=2'); // missing c
            const session = decodeSessionFromParams(params);

            expect(session).not.toBeNull();
            expect(session!.numberOfPlayers).toBeUndefined();
            expect(session!.cardsPerPlayer).toBeUndefined();
        });

        it('should ignore card config if out of range', () => {
            const params1 = new URLSearchParams('s=abc123&p=0&c=3');
            const session1 = decodeSessionFromParams(params1);
            expect(session1).not.toBeNull();
            expect(session1!.numberOfPlayers).toBeUndefined();

            const params2 = new URLSearchParams('s=abc123&p=2&c=11');
            const session2 = decodeSessionFromParams(params2);
            expect(session2).not.toBeNull();
            expect(session2!.cardsPerPlayer).toBeUndefined();
        });

        it('should fill missing player names with empty strings', () => {
            const params = new URLSearchParams('s=abc123&p=3&c=1&n=Alice');
            const session = decodeSessionFromParams(params);

            expect(session).not.toBeNull();
            expect(session!.playerNames).toHaveLength(3);
            expect(session!.playerNames![0]).toBe('Alice');
            expect(session!.playerNames![1]).toBe('');
            expect(session!.playerNames![2]).toBe('');
        });

        it('should handle no names param', () => {
            const params = new URLSearchParams('s=abc123&p=2&c=1');
            const session = decodeSessionFromParams(params);

            expect(session).not.toBeNull();
            expect(session!.playerNames).toHaveLength(2);
            expect(session!.playerNames).toEqual(['', '']);
        });
    });

    describe('createShareableUrl', () => {
        it('should create a shareable URL with session params', () => {
            const session: SessionData = {
                seed: 'test123',
                drawnNumbers: [1, 2, 3],
                numberOfPlayers: 2,
                cardsPerPlayer: 3,
                playerNames: ['Alice', 'Bob'],
            };

            const url = createShareableUrl(session);
            // Check for expected URL structure (origin may vary in test environment)
            expect(url).toContain('/?');
            expect(url).toContain('s=test123');
            expect(url).toContain('d=1%2C2%2C3'); // Comma is URL-encoded
            expect(url).toContain('p=2');
            expect(url).toContain('c=3');
            expect(url).toContain('n=Alice%2CBob');
        });

        it('should create URL for draw-only session', () => {
            const session: SessionData = {
                seed: 'drawOnly',
                drawnNumbers: [42, 88],
            };

            const url = createShareableUrl(session);
            expect(url).toContain('s=drawOnly');
            expect(url).toContain('d=42%2C88');
            expect(url).not.toContain('p=');
            expect(url).not.toContain('c=');
        });

        it('should include the window origin in the URL', () => {
            const session: SessionData = {
                seed: 'origin123',
                drawnNumbers: [],
                numberOfPlayers: 1,
                cardsPerPlayer: 1,
                playerNames: [],
            };

            const url = createShareableUrl(session);
            // URL should start with http:// or https://
            expect(url).toMatch(/^https?:\/\//);
        });
    });

    describe('round-trip encoding/decoding', () => {
        it('should preserve session data through encode/decode cycle', () => {
            const original: SessionData = {
                seed: 'roundTrip123',
                drawnNumbers: [1, 23, 45, 67, 89],
                numberOfPlayers: 4,
                cardsPerPlayer: 2,
                playerNames: ['Alice', 'Bob', 'Charlie', 'Diana'],
            };

            const params = encodeSessionToParams(original);
            const decoded = decodeSessionFromParams(params);

            expect(decoded).not.toBeNull();
            expect(decoded!.seed).toBe(original.seed);
            expect(decoded!.drawnNumbers).toEqual(original.drawnNumbers);
            expect(decoded!.numberOfPlayers).toBe(original.numberOfPlayers);
            expect(decoded!.cardsPerPlayer).toBe(original.cardsPerPlayer);
            expect(decoded!.playerNames).toEqual(original.playerNames);
        });

        it('should preserve draw-only session through encode/decode cycle', () => {
            const original: SessionData = {
                seed: 'drawOnlyTrip',
                drawnNumbers: [10, 20, 30, 40, 50],
            };

            const params = encodeSessionToParams(original);
            const decoded = decodeSessionFromParams(params);

            expect(decoded).not.toBeNull();
            expect(decoded!.seed).toBe(original.seed);
            expect(decoded!.drawnNumbers).toEqual(original.drawnNumbers);
            expect(decoded!.numberOfPlayers).toBeUndefined();
        });

        it('should generate consistent cards after URL round-trip', () => {
            const session: SessionData = {
                seed: 'consistentSeed',
                drawnNumbers: [],
                numberOfPlayers: 2,
                cardsPerPlayer: 2,
                playerNames: ['P1', 'P2'],
            };

            // Generate original cards
            const originalCards = [];
            let cardId = 1;
            for (let i = 0; i < session.numberOfPlayers!; i++) {
                for (let j = 0; j < session.cardsPerPlayer!; j++) {
                    originalCards.push(generateLottoCardWithSeed(session.seed, cardId++));
                }
            }

            // Encode and decode session
            const params = encodeSessionToParams(session);
            const decoded = decodeSessionFromParams(params);

            // Generate cards from decoded session
            const decodedCards = [];
            cardId = 1;
            for (let i = 0; i < decoded!.numberOfPlayers!; i++) {
                for (let j = 0; j < decoded!.cardsPerPlayer!; j++) {
                    decodedCards.push(generateLottoCardWithSeed(decoded!.seed, cardId++));
                }
            }

            // Compare cards
            expect(decodedCards).toEqual(originalCards);
        });
    });
});
