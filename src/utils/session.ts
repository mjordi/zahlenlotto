/**
 * Session management utilities for shareable game URLs.
 * Uses a seeded PRNG to generate deterministic card layouts that can be recreated from a URL.
 */

import { LottoCard } from './lotto';

/**
 * Session data that can be encoded in a URL.
 */
export interface SessionData {
    seed: string;
    numberOfPlayers: number;
    cardsPerPlayer: number;
    playerNames: string[];
}

/**
 * Generates a random alphanumeric session seed.
 */
export function generateSessionSeed(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Converts a string seed to a numeric hash for the PRNG.
 */
function seedToNumber(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Mulberry32 seeded PRNG - produces deterministic random numbers from a seed.
 * Returns a function that generates numbers between 0 and 1.
 */
function createSeededRandom(seed: string): () => number {
    let state = seedToNumber(seed);
    return function() {
        state |= 0;
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Generates a lotto card using a seeded random number generator.
 * Given the same seed and card index, will always produce the same card.
 */
export function generateLottoCardWithSeed(seed: string, cardIndex: number): LottoCard {
    // Create a unique seed for this specific card
    const cardSeed = `${seed}-card-${cardIndex}`;
    const random = createSeededRandom(cardSeed);

    // Initialize 3x9 grid with null
    const card: LottoCard = Array(3).fill(null).map(() => Array(9).fill(null));

    // Define column ranges
    const columnRanges: number[][] = [
        Array.from({ length: 9 }, (_, i) => i + 1),      // 1-9
        Array.from({ length: 10 }, (_, i) => i + 10),    // 10-19
        Array.from({ length: 10 }, (_, i) => i + 20),    // 20-29
        Array.from({ length: 10 }, (_, i) => i + 30),    // 30-39
        Array.from({ length: 10 }, (_, i) => i + 40),    // 40-49
        Array.from({ length: 10 }, (_, i) => i + 50),    // 50-59
        Array.from({ length: 10 }, (_, i) => i + 60),    // 60-69
        Array.from({ length: 10 }, (_, i) => i + 70),    // 70-79
        Array.from({ length: 11 }, (_, i) => i + 80),    // 80-90
    ];

    // Seeded shuffle function
    const shuffle = <T>(array: T[]): T[] => {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    };

    // Generate card with seeded randomness
    for (let row = 0; row < 3; row++) {
        const columnsIndices = Array.from({ length: 9 }, (_, i) => i);
        const selectedColumns = shuffle(columnsIndices).slice(0, 5);

        for (const col of selectedColumns) {
            const usedInCol = [card[0][col], card[1][col], card[2][col]].filter(n => n !== null) as number[];
            const available = columnRanges[col].filter(n => !usedInCol.includes(n));

            if (available.length > 0) {
                const shuffledAvailable = shuffle(available);
                card[row][col] = shuffledAvailable[0];
            }
        }
    }

    // Sort columns
    for (let col = 0; col < 9; col++) {
        const colValues: { row: number, val: number }[] = [];
        for (let row = 0; row < 3; row++) {
            const val = card[row][col];
            if (val !== null) {
                colValues.push({ row, val });
            }
        }

        colValues.sort((a, b) => a.val - b.val);
        const rowsWithValues = colValues.map(cv => cv.row).sort((a, b) => a - b);

        for (let row = 0; row < 3; row++) {
            card[row][col] = null;
        }

        for (let i = 0; i < colValues.length; i++) {
            const targetRow = rowsWithValues[i];
            card[targetRow][col] = colValues[i].val;
        }
    }

    return card;
}

/**
 * Encodes session data into URL search params.
 */
export function encodeSessionToParams(session: SessionData): URLSearchParams {
    const params = new URLSearchParams();
    params.set('s', session.seed);
    params.set('p', session.numberOfPlayers.toString());
    params.set('c', session.cardsPerPlayer.toString());

    // Only include non-empty player names
    const nonEmptyNames = session.playerNames.filter(name => name.trim() !== '');
    if (nonEmptyNames.length > 0) {
        params.set('n', nonEmptyNames.join(','));
    }

    return params;
}

/**
 * Decodes session data from URL search params.
 * Returns null if required params are missing or invalid.
 */
export function decodeSessionFromParams(params: URLSearchParams): SessionData | null {
    const seed = params.get('s');
    const playersStr = params.get('p');
    const cardsStr = params.get('c');
    const namesStr = params.get('n');

    if (!seed || !playersStr || !cardsStr) {
        return null;
    }

    const numberOfPlayers = parseInt(playersStr, 10);
    const cardsPerPlayer = parseInt(cardsStr, 10);

    if (isNaN(numberOfPlayers) || isNaN(cardsPerPlayer)) {
        return null;
    }

    if (numberOfPlayers < 1 || numberOfPlayers > 20) {
        return null;
    }

    if (cardsPerPlayer < 1 || cardsPerPlayer > 10) {
        return null;
    }

    // Parse player names, filling with empty strings for missing names
    const playerNames: string[] = [];
    if (namesStr) {
        const names = namesStr.split(',');
        for (let i = 0; i < numberOfPlayers; i++) {
            playerNames.push(names[i] || '');
        }
    } else {
        for (let i = 0; i < numberOfPlayers; i++) {
            playerNames.push('');
        }
    }

    return {
        seed,
        numberOfPlayers,
        cardsPerPlayer,
        playerNames,
    };
}

/**
 * Creates a shareable URL for the current session.
 */
export function createShareableUrl(session: SessionData): string {
    const params = encodeSessionToParams(session);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/?${params.toString()}`;
}

/**
 * Checks if the current URL contains session data.
 */
export function hasSessionInUrl(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('s') && params.has('p') && params.has('c');
}

/**
 * Gets session data from the current URL.
 */
export function getSessionFromUrl(): SessionData | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return decodeSessionFromParams(params);
}
