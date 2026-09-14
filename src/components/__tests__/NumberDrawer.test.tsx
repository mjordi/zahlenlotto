/**
 * Tests for the host/guest split in NumberDrawer.
 *
 * Guests hold read-only access and receive state through sync, so the checks
 * here focus on what a guest may do and what they must still see.
 */

import { render, screen } from '@testing-library/react';
import NumberDrawer from '../NumberDrawer';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Card, LottoCard as LottoGrid } from '@/utils/lotto';
import type { SessionData } from '@/utils/session';

jest.mock('canvas-confetti', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/utils/pdfGenerator', () => ({ generatePdf: jest.fn() }));

// The hook is exercised directly in src/hooks/__tests__/useGameSync.test.ts;
// here it is stubbed so the component can be driven through its props.
jest.mock('@/hooks/useGameSync', () => ({
    useGameSync: () => ({
        claimSession: jest.fn(),
        pushState: jest.fn(),
        pushCardConfig: jest.fn(),
        resetState: jest.fn(),
        syncUnavailable: false,
    }),
}));

/** A card whose first row completes exactly on 1, 11, 21, 31, 41. */
function makeCard(id: number, playerName: string): Card {
    const grid: LottoGrid = [
        [1, 11, 21, 31, 41, null, null, null, null],
        [2, 12, 22, 32, 42, null, null, null, null],
        [3, 13, 23, 33, 43, null, null, null, null],
    ];
    return { id, grid, playerName };
}

const SESSION: SessionData = { seed: 'sharedSeed', drawnNumbers: [] };

function renderDrawer(overrides: Partial<React.ComponentProps<typeof NumberDrawer>> = {}) {
    const props: React.ComponentProps<typeof NumberDrawer> = {
        drawnNumbers: [],
        setDrawnNumbers: jest.fn(),
        currentNumber: null,
        setCurrentNumber: jest.fn(),
        soundEnabled: false,
        setSoundEnabled: jest.fn(),
        generatedCards: [],
        setGeneratedCards: jest.fn(),
        sessionData: null,
        setSessionData: jest.fn(),
        joinedFromUrl: false,
        ...overrides,
    };

    const view = render(
        <LanguageProvider>
            <NumberDrawer {...props} />
        </LanguageProvider>
    );

    const rerender = (next: Partial<React.ComponentProps<typeof NumberDrawer>>) =>
        view.rerender(
            <LanguageProvider>
                <NumberDrawer {...props} {...next} />
            </LanguageProvider>
        );

    return { ...view, rerender, props };
}

describe('NumberDrawer', () => {
    describe('guest restrictions', () => {
        it('should disable draw and restart for a guest', () => {
            renderDrawer({ sessionData: SESSION, joinedFromUrl: true });

            expect(screen.getByRole('button', { name: /Zahl ziehen/i })).toBeDisabled();
            expect(screen.getByRole('button', { name: /Neu starten/i })).toBeDisabled();
        });

        it('should show the spectator badge to a guest', () => {
            renderDrawer({ sessionData: SESSION, joinedFromUrl: true });

            expect(screen.getByText(/Zuschauermodus/i)).toBeInTheDocument();
        });

        it('should not offer the share button to a guest', () => {
            renderDrawer({ sessionData: SESSION, joinedFromUrl: true });

            expect(screen.queryByRole('button', { name: /Spiel teilen/i })).not.toBeInTheDocument();
        });

        it('should not offer card generation to a guest', () => {
            renderDrawer({ sessionData: SESSION, joinedFromUrl: true });

            expect(screen.queryByRole('button', { name: /Karten generieren/i })).not.toBeInTheDocument();
            expect(screen.getByText(/Warten auf Karten/i)).toBeInTheDocument();
        });

        it('should keep draw and restart enabled for a host', () => {
            renderDrawer({ sessionData: SESSION, joinedFromUrl: false });

            expect(screen.getByRole('button', { name: /Zahl ziehen/i })).toBeEnabled();
            expect(screen.getByRole('button', { name: /Neu starten/i })).toBeEnabled();
            expect(screen.queryByText(/Zuschauermodus/i)).not.toBeInTheDocument();
        });
    });

    describe('row completion for guests', () => {
        const cards = [makeCard(1, 'Alice')];

        it('should celebrate a row completed by numbers received through sync', () => {
            const { rerender } = renderDrawer({
                sessionData: SESSION,
                joinedFromUrl: true,
                generatedCards: cards,
                drawnNumbers: [1, 11, 21, 31],
                currentNumber: 31,
            });

            expect(screen.queryByRole('alert')).not.toBeInTheDocument();

            // The host draws 41; the guest receives it through sync
            rerender({ drawnNumbers: [1, 11, 21, 31, 41], currentNumber: 41 });

            const celebration = screen.getByRole('alert');
            expect(celebration).toHaveTextContent(/LOTTO!/i);
            expect(celebration).toHaveTextContent('Alice');
        });

        it('should not celebrate rows that were already complete when joining', () => {
            renderDrawer({
                sessionData: SESSION,
                joinedFromUrl: true,
                generatedCards: cards,
                drawnNumbers: [1, 11, 21, 31, 41],
                currentNumber: 41,
            });

            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });

        it('should not celebrate when cards arrive after the numbers', () => {
            // Guests receive the card config a poll after the drawn numbers
            const { rerender } = renderDrawer({
                sessionData: SESSION,
                joinedFromUrl: true,
                generatedCards: [],
                drawnNumbers: [1, 11, 21, 31, 41],
                currentNumber: 41,
            });

            rerender({ generatedCards: cards });

            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });
    });
});
