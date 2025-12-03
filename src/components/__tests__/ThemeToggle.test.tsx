import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
            matches,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
};

function renderThemeToggle() {
    return render(
        <ThemeProvider>
            <LanguageProvider>
                <ThemeToggle />
            </LanguageProvider>
        </ThemeProvider>
    );
}

describe('ThemeToggle', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.spyOn(document.documentElement, 'setAttribute');
        mockMatchMedia(true); // default to dark mode
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should render theme toggle button', () => {
        renderThemeToggle();
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
    });

    it('should show monitor icon when in auto mode', async () => {
        mockMatchMedia(true);
        renderThemeToggle();

        await waitFor(() => {
            const button = screen.getByRole('button');
            const svg = button.querySelector('svg');
            expect(svg).toBeInTheDocument();
            // Monitor icon has a rect element
            const rect = button.querySelector('rect');
            expect(rect).toBeInTheDocument();
        });
    });

    it('should show sun icon when in light mode', async () => {
        mockMatchMedia(false);
        localStorage.setItem('themePreference', 'light');
        renderThemeToggle();

        await waitFor(() => {
            const button = screen.getByRole('button');
            const svg = button.querySelector('svg');
            expect(svg).toBeInTheDocument();
            // Sun icon has multiple line elements for rays
            const lines = button.querySelectorAll('line');
            expect(lines.length).toBeGreaterThan(0);
        });
    });

    it('should show moon icon when in dark mode', async () => {
        mockMatchMedia(true);
        localStorage.setItem('themePreference', 'dark');
        renderThemeToggle();

        await waitFor(() => {
            const button = screen.getByRole('button');
            const svg = button.querySelector('svg');
            expect(svg).toBeInTheDocument();
            // Moon icon has a path element
            const path = button.querySelector('path');
            expect(path).toBeInTheDocument();
            expect(path?.getAttribute('d')).toContain('M21');
        });
    });

    it('should cycle through themes when clicked', async () => {
        mockMatchMedia(true);
        const user = userEvent.setup();
        renderThemeToggle();

        const button = screen.getByRole('button');

        // Should start in auto mode
        await waitFor(() => {
            expect(localStorage.getItem('themePreference')).toBeNull();
        });

        // First click: auto -> light
        await user.click(button);
        await waitFor(() => {
            expect(localStorage.getItem('themePreference')).toBe('light');
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
        });

        // Second click: light -> dark
        await user.click(button);
        await waitFor(() => {
            expect(localStorage.getItem('themePreference')).toBe('dark');
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
        });

        // Third click: dark -> auto
        await user.click(button);
        await waitFor(() => {
            expect(localStorage.getItem('themePreference')).toBe('auto');
        });
    });

    it('should have proper aria-label for auto mode', async () => {
        mockMatchMedia(true);
        renderThemeToggle();

        await waitFor(() => {
            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-label');
            const label = button.getAttribute('aria-label');
            // In German (default language): "Automatisch"
            expect(label).toContain('Automatisch');
        });
    });

    it('should have proper aria-label for light mode', async () => {
        mockMatchMedia(false);
        localStorage.setItem('themePreference', 'light');
        renderThemeToggle();

        await waitFor(() => {
            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-label');
            const label = button.getAttribute('aria-label');
            // In German (default language): "Hell"
            expect(label).toBe('Hell');
        });
    });

    it('should have proper aria-label for dark mode', async () => {
        mockMatchMedia(true);
        localStorage.setItem('themePreference', 'dark');
        renderThemeToggle();

        await waitFor(() => {
            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-label');
            const label = button.getAttribute('aria-label');
            // In German (default language): "Dunkel"
            expect(label).toBe('Dunkel');
        });
    });

    it('should cycle correctly multiple times', async () => {
        mockMatchMedia(true);
        const user = userEvent.setup();
        renderThemeToggle();

        const button = screen.getByRole('button');

        // Cycle through all modes twice
        for (let i = 0; i < 2; i++) {
            // auto -> light
            await user.click(button);
            await waitFor(() => {
                expect(localStorage.getItem('themePreference')).toBe('light');
            });

            // light -> dark
            await user.click(button);
            await waitFor(() => {
                expect(localStorage.getItem('themePreference')).toBe('dark');
            });

            // dark -> auto
            await user.click(button);
            await waitFor(() => {
                expect(localStorage.getItem('themePreference')).toBe('auto');
            });
        }
    });
});
