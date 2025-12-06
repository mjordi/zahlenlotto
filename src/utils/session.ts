/**
 * Session management utilities for shareable game URLs.
 * Uses a seeded PRNG to generate deterministic card layouts that can be recreated from a URL.
 * Supports real-time sync across browser tabs via BroadcastChannel.
 */

import { LottoCard } from './lotto';

/**
 * Session data that can be encoded in a URL.
 * Card configuration is optional - sessions can be draw-only.
 */
export interface SessionData {
    seed: string;
    drawnNumbers: number[];
    // Card configuration is optional
    numberOfPlayers?: number;
    cardsPerPlayer?: number;
    playerNames?: string[];
}

/**
 * Message types for BroadcastChannel sync.
 */
export interface SyncMessage {
    type: 'NUMBER_DRAWN' | 'RESET' | 'SYNC_REQUEST' | 'SYNC_RESPONSE';
    seed: string;
    drawnNumbers: number[];
    currentNumber?: number | null;
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
 * Encodes drawn numbers as a compact string (comma-separated).
 */
function encodeDrawnNumbers(numbers: number[]): string {
    return numbers.join(',');
}

/**
 * Decodes drawn numbers from a compact string.
 */
function decodeDrawnNumbers(str: string): number[] {
    if (!str) return [];
    return str.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n >= 1 && n <= 90);
}

/**
 * Encodes session data into URL search params.
 */
export function encodeSessionToParams(session: SessionData): URLSearchParams {
    const params = new URLSearchParams();
    params.set('s', session.seed);

    // Encode drawn numbers
    if (session.drawnNumbers.length > 0) {
        params.set('d', encodeDrawnNumbers(session.drawnNumbers));
    }

    // Card configuration is optional
    if (session.numberOfPlayers !== undefined && session.cardsPerPlayer !== undefined) {
        params.set('p', session.numberOfPlayers.toString());
        params.set('c', session.cardsPerPlayer.toString());

        // Only include non-empty player names
        if (session.playerNames) {
            const nonEmptyNames = session.playerNames.filter(name => name.trim() !== '');
            if (nonEmptyNames.length > 0) {
                params.set('n', nonEmptyNames.join(','));
            }
        }
    }

    return params;
}

/**
 * Decodes session data from URL search params.
 * Returns null if seed is missing.
 */
export function decodeSessionFromParams(params: URLSearchParams): SessionData | null {
    const seed = params.get('s');

    if (!seed) {
        return null;
    }

    // Decode drawn numbers
    const drawnStr = params.get('d');
    const drawnNumbers = drawnStr ? decodeDrawnNumbers(drawnStr) : [];

    // Card configuration is optional
    const playersStr = params.get('p');
    const cardsStr = params.get('c');
    const namesStr = params.get('n');

    let numberOfPlayers: number | undefined;
    let cardsPerPlayer: number | undefined;
    let playerNames: string[] | undefined;

    if (playersStr && cardsStr) {
        numberOfPlayers = parseInt(playersStr, 10);
        cardsPerPlayer = parseInt(cardsStr, 10);

        if (isNaN(numberOfPlayers) || isNaN(cardsPerPlayer)) {
            numberOfPlayers = undefined;
            cardsPerPlayer = undefined;
        } else {
            if (numberOfPlayers < 1 || numberOfPlayers > 20) {
                numberOfPlayers = undefined;
                cardsPerPlayer = undefined;
            } else if (cardsPerPlayer < 1 || cardsPerPlayer > 10) {
                numberOfPlayers = undefined;
                cardsPerPlayer = undefined;
            } else {
                // Parse player names
                playerNames = [];
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
            }
        }
    }

    return {
        seed,
        drawnNumbers,
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
    return params.has('s'); // Only seed is required
}

/**
 * Gets session data from the current URL.
 */
export function getSessionFromUrl(): SessionData | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return decodeSessionFromParams(params);
}

/**
 * BroadcastChannel manager for real-time sync across browser tabs.
 */
export class SessionSync {
    private channel: BroadcastChannel | null = null;
    private seed: string;
    private onNumberDrawn: (numbers: number[], current: number | null) => void;
    private onReset: () => void;
    private onSyncResponse: (numbers: number[], current: number | null) => void;
    private isHost: boolean;

    constructor(
        seed: string,
        callbacks: {
            onNumberDrawn: (numbers: number[], current: number | null) => void;
            onReset: () => void;
            onSyncResponse: (numbers: number[], current: number | null) => void;
        },
        isHost: boolean = false
    ) {
        this.seed = seed;
        this.onNumberDrawn = callbacks.onNumberDrawn;
        this.onReset = callbacks.onReset;
        this.onSyncResponse = callbacks.onSyncResponse;
        this.isHost = isHost;

        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            this.channel = new BroadcastChannel(`zahlenlotto-${seed}`);
            this.channel.onmessage = this.handleMessage.bind(this);
        }
    }

    private handleMessage(event: MessageEvent<SyncMessage>) {
        const message = event.data;

        // Ignore messages for different sessions
        if (message.seed !== this.seed) return;

        switch (message.type) {
            case 'NUMBER_DRAWN':
                this.onNumberDrawn(message.drawnNumbers, message.currentNumber ?? null);
                break;
            case 'RESET':
                this.onReset();
                break;
            case 'SYNC_REQUEST':
                // Host responds to sync requests
                // This is handled by the component
                break;
            case 'SYNC_RESPONSE':
                this.onSyncResponse(message.drawnNumbers, message.currentNumber ?? null);
                break;
        }
    }

    /**
     * Broadcast a number drawn event.
     */
    broadcastNumberDrawn(drawnNumbers: number[], currentNumber: number | null) {
        if (!this.channel) return;
        const message: SyncMessage = {
            type: 'NUMBER_DRAWN',
            seed: this.seed,
            drawnNumbers,
            currentNumber,
        };
        this.channel.postMessage(message);
    }

    /**
     * Broadcast a reset event.
     */
    broadcastReset() {
        if (!this.channel) return;
        const message: SyncMessage = {
            type: 'RESET',
            seed: this.seed,
            drawnNumbers: [],
            currentNumber: null,
        };
        this.channel.postMessage(message);
    }

    /**
     * Request sync from host (for new joiners).
     */
    requestSync() {
        if (!this.channel) return;
        const message: SyncMessage = {
            type: 'SYNC_REQUEST',
            seed: this.seed,
            drawnNumbers: [],
        };
        this.channel.postMessage(message);
    }

    /**
     * Respond to sync request (host only).
     */
    respondToSync(drawnNumbers: number[], currentNumber: number | null) {
        if (!this.channel || !this.isHost) return;
        const message: SyncMessage = {
            type: 'SYNC_RESPONSE',
            seed: this.seed,
            drawnNumbers,
            currentNumber,
        };
        this.channel.postMessage(message);
    }

    /**
     * Set up listener for sync requests (host only).
     */
    listenForSyncRequests(getCurrentState: () => { drawnNumbers: number[]; currentNumber: number | null }) {
        if (!this.channel || !this.isHost) return;

        const channel = this.channel;
        const originalHandler = channel.onmessage;
        channel.onmessage = (event: MessageEvent<SyncMessage>) => {
            if (event.data.type === 'SYNC_REQUEST' && event.data.seed === this.seed) {
                const state = getCurrentState();
                this.respondToSync(state.drawnNumbers, state.currentNumber);
            }
            // Still call original handler for other messages
            if (originalHandler) {
                originalHandler.call(channel, event);
            }
        };
    }

    /**
     * Clean up the channel.
     */
    destroy() {
        if (this.channel) {
            this.channel.close();
            this.channel = null;
        }
    }
}
