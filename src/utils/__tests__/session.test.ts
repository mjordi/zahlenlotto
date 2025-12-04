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
        it('should encode basic session data', () => {
            const session: SessionData = {
                seed: 'abc123',
                numberOfPlayers: 2,
                cardsPerPlayer: 3,
                playerNames: ['Alice', 'Bob'],
            };

            const params = encodeSessionToParams(session);
            expect(params.get('s')).toBe('abc123');
            expect(params.get('p')).toBe('2');
            expect(params.get('c')).toBe('3');
            expect(params.get('n')).toBe('Alice,Bob');
        });

        it('should not include names param when all names are empty', () => {
            const session: SessionData = {
                seed: 'xyz789',
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
                numberOfPlayers: 3,
                cardsPerPlayer: 1,
                playerNames: ['Alice', '', 'Charlie'],
            };

            const params = encodeSessionToParams(session);
            expect(params.get('n')).toBe('Alice,Charlie');
        });
    });

    describe('decodeSessionFromParams', () => {
        it('should decode valid session params', () => {
            const params = new URLSearchParams('s=abc123&p=2&c=3&n=Alice,Bob');
            const session = decodeSessionFromParams(params);

            expect(session).not.toBeNull();
            expect(session!.seed).toBe('abc123');
            expect(session!.numberOfPlayers).toBe(2);
            expect(session!.cardsPerPlayer).toBe(3);
            expect(session!.playerNames).toEqual(['Alice', 'Bob']);
        });

        it('should return null for missing seed', () => {
            const params = new URLSearchParams('p=2&c=3');
            expect(decodeSessionFromParams(params)).toBeNull();
        });

        it('should return null for missing player count', () => {
            const params = new URLSearchParams('s=abc123&c=3');
            expect(decodeSessionFromParams(params)).toBeNull();
        });

        it('should return null for missing cards per player', () => {
            const params = new URLSearchParams('s=abc123&p=2');
            expect(decodeSessionFromParams(params)).toBeNull();
        });

        it('should return null for invalid player count', () => {
            const params = new URLSearchParams('s=abc123&p=invalid&c=3');
            expect(decodeSessionFromParams(params)).toBeNull();
        });

        it('should return null for player count out of range', () => {
            const params1 = new URLSearchParams('s=abc123&p=0&c=3');
            const params2 = new URLSearchParams('s=abc123&p=21&c=3');
            expect(decodeSessionFromParams(params1)).toBeNull();
            expect(decodeSessionFromParams(params2)).toBeNull();
        });

        it('should return null for cards per player out of range', () => {
            const params1 = new URLSearchParams('s=abc123&p=2&c=0');
            const params2 = new URLSearchParams('s=abc123&p=2&c=11');
            expect(decodeSessionFromParams(params1)).toBeNull();
            expect(decodeSessionFromParams(params2)).toBeNull();
        });

        it('should fill missing player names with empty strings', () => {
            const params = new URLSearchParams('s=abc123&p=3&c=1&n=Alice');
            const session = decodeSessionFromParams(params);

            expect(session).not.toBeNull();
            expect(session!.playerNames).toHaveLength(3);
            expect(session!.playerNames[0]).toBe('Alice');
            expect(session!.playerNames[1]).toBe('');
            expect(session!.playerNames[2]).toBe('');
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
                numberOfPlayers: 2,
                cardsPerPlayer: 3,
                playerNames: ['Alice', 'Bob'],
            };

            const url = createShareableUrl(session);
            // Check for expected URL structure (origin may vary in test environment)
            expect(url).toContain('/?');
            expect(url).toContain('s=test123');
            expect(url).toContain('p=2');
            expect(url).toContain('c=3');
            expect(url).toContain('n=Alice%2CBob'); // Comma is URL-encoded
        });

        it('should include the window origin in the URL', () => {
            const session: SessionData = {
                seed: 'origin123',
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
                numberOfPlayers: 4,
                cardsPerPlayer: 2,
                playerNames: ['Alice', 'Bob', 'Charlie', 'Diana'],
            };

            const params = encodeSessionToParams(original);
            const decoded = decodeSessionFromParams(params);

            expect(decoded).not.toBeNull();
            expect(decoded!.seed).toBe(original.seed);
            expect(decoded!.numberOfPlayers).toBe(original.numberOfPlayers);
            expect(decoded!.cardsPerPlayer).toBe(original.cardsPerPlayer);
            expect(decoded!.playerNames).toEqual(original.playerNames);
        });

        it('should generate consistent cards after URL round-trip', () => {
            const session: SessionData = {
                seed: 'consistentSeed',
                numberOfPlayers: 2,
                cardsPerPlayer: 2,
                playerNames: ['P1', 'P2'],
            };

            // Generate original cards
            const originalCards = [];
            let cardId = 1;
            for (let i = 0; i < session.numberOfPlayers; i++) {
                for (let j = 0; j < session.cardsPerPlayer; j++) {
                    originalCards.push(generateLottoCardWithSeed(session.seed, cardId++));
                }
            }

            // Encode and decode session
            const params = encodeSessionToParams(session);
            const decoded = decodeSessionFromParams(params);

            // Generate cards from decoded session
            const decodedCards = [];
            cardId = 1;
            for (let i = 0; i < decoded!.numberOfPlayers; i++) {
                for (let j = 0; j < decoded!.cardsPerPlayer; j++) {
                    decodedCards.push(generateLottoCardWithSeed(decoded!.seed, cardId++));
                }
            }

            // Compare cards
            expect(decodedCards).toEqual(originalCards);
        });
    });
});
