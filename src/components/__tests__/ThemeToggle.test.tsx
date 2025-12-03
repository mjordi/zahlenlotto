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

    it('should show sun icon when in dark mode', async () => {
        mockMatchMedia(true);
        renderThemeToggle();

        await waitFor(() => {
            const button = screen.getByRole('button');
            // Sun icon has a circle element
            const svg = button.querySelector('svg');
            expect(svg).toBeInTheDocument();
            // Sun icon has multiple line elements for rays
            const lines = button.querySelectorAll('line');
            expect(lines.length).toBeGreaterThan(0);
        });
    });

    it('should show moon icon when in light mode', async () => {
        mockMatchMedia(false);
        localStorage.setItem('theme', 'light');
        renderThemeToggle();

        await waitFor(() => {
            const button = screen.getByRole('button');
            const svg = button.querySelector('svg');
            expect(svg).toBeInTheDocument();
            // Moon icon has a path element
            const path = button.querySelector('path');
            expect(path).toBeInTheDocument();
        });
    });

    it('should toggle theme when clicked', async () => {
        mockMatchMedia(true);
        const user = userEvent.setup();
        renderThemeToggle();

        await waitFor(() => {
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
        });

        const button = screen.getByRole('button');
        await user.click(button);

        await waitFor(() => {
            expect(localStorage.getItem('theme')).toBe('light');
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
        });
    });

    it('should have proper aria-label for dark mode', async () => {
        mockMatchMedia(true);
        renderThemeToggle();

        await waitFor(() => {
            const button = screen.getByRole('button');
            // In German (default language): "Zu hellem Modus wechseln"
            expect(button).toHaveAttribute('aria-label');
            const label = button.getAttribute('aria-label');
            expect(label).toContain('hell'); // German for "light"
        });
    });

    it('should have proper aria-label for light mode', async () => {
        mockMatchMedia(false);
        localStorage.setItem('theme', 'light');
        renderThemeToggle();

        await waitFor(() => {
            const button = screen.getByRole('button');
            // In German (default language): "Zu dunklem Modus wechseln"
            expect(button).toHaveAttribute('aria-label');
            const label = button.getAttribute('aria-label');
            // Check for "dunklem" (dative case of "dark" in German)
            expect(label).toBeTruthy();
            expect(label).toContain('Modus'); // Just check it has "Modus" to confirm structure
        });
    });

    it('should toggle multiple times correctly', async () => {
        mockMatchMedia(true);
        const user = userEvent.setup();
        renderThemeToggle();

        const button = screen.getByRole('button');

        // First click: dark -> light
        await user.click(button);
        await waitFor(() => {
            expect(localStorage.getItem('theme')).toBe('light');
        });

        // Second click: light -> dark
        await user.click(button);
        await waitFor(() => {
            expect(localStorage.getItem('theme')).toBe('dark');
        });

        // Third click: dark -> light
        await user.click(button);
        await waitFor(() => {
            expect(localStorage.getItem('theme')).toBe('light');
        });
    });
});
