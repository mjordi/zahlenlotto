/**
 * Guards the URL-loading effect against re-entry.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../page';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { storeHostToken } from '@/utils/session';

jest.mock('canvas-confetti', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/utils/pdfGenerator', () => ({ generatePdf: jest.fn() }));
jest.mock('@/hooks/useGameSync', () => ({
    useGameSync: () => ({
        claimSession: jest.fn(),
        pushState: jest.fn(),
        pushCardConfig: jest.fn(),
        resetState: jest.fn(),
        syncUnavailable: false,
        isHydrating: false,
    }),
}));

beforeAll(() => {
    // jsdom has neither of these and both are needed to render the page
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
});

describe('Home session loading', () => {
    it('should keep the card configuration in the share link after a language change', async () => {
        window.sessionStorage.clear();
        // Hold the host token so this tab is the host and can share
        storeHostToken('abc12345', 'host-token-for-tests-0123456789');
        window.history.replaceState({}, '', '/?s=abc12345&p=2&c=1&n=Alice,Bob');

        const user = userEvent.setup();
        render(
            <ThemeProvider>
                <LanguageProvider>
                    <Home />
                </LanguageProvider>
            </ThemeProvider>
        );

        await screen.findByText(/Alice/);

        // Switch to English. The URL is seed-only by now, so re-entering the
        // effect would decode a session without p/c/n and overwrite the state.
        await user.click(screen.getByRole('button', { name: /Sprache wählen/i }));
        await user.click(await screen.findByRole('menuitem', { name: /English/i }));

        // Two share controls exist (main row and cards panel); either will do
        await user.click(screen.getAllByRole('button', { name: /Share Game/i })[0]);

        // userEvent installs its own clipboard stub; read the link back from it
        let copied = '';
        await waitFor(async () => {
            copied = await navigator.clipboard.readText();
            expect(copied).toContain('s=abc12345');
        });

        const params = new URLSearchParams(copied.split('?')[1]);
        expect(params.get('s')).toBe('abc12345');
        expect(params.get('p')).toBe('2');
        expect(params.get('c')).toBe('1');
        expect(params.get('n')).toBe('Alice,Bob');
    });
});
