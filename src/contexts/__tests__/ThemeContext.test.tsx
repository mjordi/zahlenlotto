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
    const { themePreference, appliedTheme, setThemePreference, cycleTheme } = useTheme();
    return (
        <div>
            <div data-testid="preference">{themePreference}</div>
            <div data-testid="applied">{appliedTheme}</div>
            <button onClick={() => setThemePreference('auto')}>Set Auto</button>
            <button onClick={() => setThemePreference('light')}>Set Light</button>
            <button onClick={() => setThemePreference('dark')}>Set Dark</button>
            <button onClick={cycleTheme}>Cycle</button>
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

    it('should provide default preference as auto', () => {
        mockMatchMedia(true); // prefers dark mode
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        expect(screen.getByTestId('preference')).toHaveTextContent('auto');
    });

    it('should apply system dark theme when in auto mode', async () => {
        mockMatchMedia(true); // prefers dark mode
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('applied')).toHaveTextContent('dark');
        });
    });

    it('should apply system light theme when in auto mode', async () => {
        mockMatchMedia(false); // prefers light mode
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('applied')).toHaveTextContent('light');
        });
    });

    it('should respect saved preference from localStorage', async () => {
        mockMatchMedia(true); // prefers dark mode
        localStorage.setItem('themePreference', 'light');

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('preference')).toHaveTextContent('light');
            expect(screen.getByTestId('applied')).toHaveTextContent('light');
        });
    });

    it('should allow manual preference change to light', async () => {
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

        expect(screen.getByTestId('preference')).toHaveTextContent('light');
        expect(screen.getByTestId('applied')).toHaveTextContent('light');
        expect(localStorage.getItem('themePreference')).toBe('light');
        expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    });

    it('should allow manual preference change to dark', async () => {
        mockMatchMedia(false);
        const user = userEvent.setup();

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await act(async () => {
            await user.click(screen.getByText('Set Dark'));
        });

        expect(screen.getByTestId('preference')).toHaveTextContent('dark');
        expect(screen.getByTestId('applied')).toHaveTextContent('dark');
        expect(localStorage.getItem('themePreference')).toBe('dark');
        expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('should allow manual preference change to auto', async () => {
        mockMatchMedia(true); // system prefers dark
        localStorage.setItem('themePreference', 'light');
        const user = userEvent.setup();

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await act(async () => {
            await user.click(screen.getByText('Set Auto'));
        });

        expect(screen.getByTestId('preference')).toHaveTextContent('auto');
        expect(screen.getByTestId('applied')).toHaveTextContent('dark'); // should follow system
        expect(localStorage.getItem('themePreference')).toBe('auto');
    });

    it('should cycle through auto -> light -> dark -> auto', async () => {
        mockMatchMedia(true);
        const user = userEvent.setup();

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('preference')).toHaveTextContent('auto');
        });

        // Cycle to light
        await act(async () => {
            await user.click(screen.getByText('Cycle'));
        });
        expect(screen.getByTestId('preference')).toHaveTextContent('light');
        expect(screen.getByTestId('applied')).toHaveTextContent('light');

        // Cycle to dark
        await act(async () => {
            await user.click(screen.getByText('Cycle'));
        });
        expect(screen.getByTestId('preference')).toHaveTextContent('dark');
        expect(screen.getByTestId('applied')).toHaveTextContent('dark');

        // Cycle back to auto
        await act(async () => {
            await user.click(screen.getByText('Cycle'));
        });
        expect(screen.getByTestId('preference')).toHaveTextContent('auto');
        expect(screen.getByTestId('applied')).toHaveTextContent('dark'); // follows system
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

    it('should update applied theme when system preference changes in auto mode', async () => {
        const listeners: ((e: MediaQueryListEvent) => void)[] = [];
        const mockMediaQuery = {
            matches: true,
            media: '(prefers-color-scheme: dark)',
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn((_, listener) => listeners.push(listener)),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        };

        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: jest.fn().mockReturnValue(mockMediaQuery),
        });

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('applied')).toHaveTextContent('dark');
        });

        // Simulate system preference change to light
        act(() => {
            listeners.forEach(listener => {
                listener({ matches: false } as MediaQueryListEvent);
            });
        });

        await waitFor(() => {
            expect(screen.getByTestId('applied')).toHaveTextContent('light');
        });
    });
});
