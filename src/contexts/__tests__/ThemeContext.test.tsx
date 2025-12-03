import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../ThemeContext';
import { act } from 'react';

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

// Test component that uses the theme context
function TestComponent() {
    const { theme, setTheme, toggleTheme } = useTheme();
    return (
        <div>
            <div data-testid="theme">{theme}</div>
            <button onClick={() => setTheme('light')}>Set Light</button>
            <button onClick={() => setTheme('dark')}>Set Dark</button>
            <button onClick={toggleTheme}>Toggle</button>
        </div>
    );
}

describe('ThemeContext', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        // Mock document.documentElement.setAttribute
        jest.spyOn(document.documentElement, 'setAttribute');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should provide default theme as dark', () => {
        mockMatchMedia(true); // prefers dark mode
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    it('should respect system preference for dark mode', async () => {
        mockMatchMedia(true); // prefers dark mode
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        });
    });

    it('should respect system preference for light mode', async () => {
        mockMatchMedia(false); // prefers light mode
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('light');
        });
    });

    it('should respect saved theme from localStorage', async () => {
        mockMatchMedia(true); // prefers dark mode
        localStorage.setItem('theme', 'light');

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('light');
        });
    });

    it('should allow manual theme change to light', async () => {
        mockMatchMedia(true);
        const user = userEvent.setup();

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await act(async () => {
            await user.click(screen.getByText('Set Light'));
        });

        expect(screen.getByTestId('theme')).toHaveTextContent('light');
        expect(localStorage.getItem('theme')).toBe('light');
        expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    });

    it('should allow manual theme change to dark', async () => {
        mockMatchMedia(false);
        localStorage.setItem('theme', 'light');
        const user = userEvent.setup();

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await act(async () => {
            await user.click(screen.getByText('Set Dark'));
        });

        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        expect(localStorage.getItem('theme')).toBe('dark');
        expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('should toggle theme from dark to light', async () => {
        mockMatchMedia(true);
        const user = userEvent.setup();

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        });

        await act(async () => {
            await user.click(screen.getByText('Toggle'));
        });

        expect(screen.getByTestId('theme')).toHaveTextContent('light');
        expect(localStorage.getItem('theme')).toBe('light');
    });

    it('should toggle theme from light to dark', async () => {
        mockMatchMedia(false);
        const user = userEvent.setup();

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('light');
        });

        await act(async () => {
            await user.click(screen.getByText('Toggle'));
        });

        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should throw error when useTheme is used outside ThemeProvider', () => {
        // Suppress console.error for this test
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => {
            render(<TestComponent />);
        }).toThrow('useTheme must be used within a ThemeProvider');

        consoleSpy.mockRestore();
    });

    it('should set data-theme attribute on document element', async () => {
        mockMatchMedia(true);

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
        });
    });
});
