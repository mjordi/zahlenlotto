import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { ThemeProvider, useTheme } from '../ThemeContext';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        clear: () => {
            store = {};
        },
        removeItem: (key: string) => {
            delete store[key];
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock matchMedia
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

// Test component that uses the theme context
function TestComponent() {
    const { theme, setTheme } = useTheme();
    return (
        <div>
            <div data-testid="theme">{theme}</div>
            <button onClick={() => setTheme('light')}>Set Light</button>
            <button onClick={() => setTheme('dark')}>Set Dark</button>
        </div>
    );
}

describe('ThemeContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
        document.documentElement.className = '';
    });

    it('should start with dark theme by default', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    it('should throw error when useTheme is used outside ThemeProvider', () => {
        // Suppress console.error for this test
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });

        expect(() => {
            render(<TestComponent />);
        }).toThrow('useTheme must be used within a ThemeProvider');

        consoleError.mockRestore();
    });

    it('should switch to light theme when setTheme is called', async () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        const lightButton = screen.getByText('Set Light');

        await act(async () => {
            lightButton.click();
        });

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('light');
        });
    });

    it('should switch to dark theme when setTheme is called', async () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        const lightButton = screen.getByText('Set Light');
        const darkButton = screen.getByText('Set Dark');

        await act(async () => {
            lightButton.click();
        });

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('light');
        });

        await act(async () => {
            darkButton.click();
        });

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        });
    });

    it('should save theme to localStorage when setTheme is called', async () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        const lightButton = screen.getByText('Set Light');

        await act(async () => {
            lightButton.click();
        });

        await waitFor(() => {
            expect(localStorage.getItem('theme')).toBe('light');
        });
    });

    it('should apply light class to documentElement when light theme is set', async () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        const lightButton = screen.getByText('Set Light');

        await act(async () => {
            lightButton.click();
        });

        await waitFor(() => {
            expect(document.documentElement.classList.contains('light')).toBe(true);
        });
    });

    it('should remove light class from documentElement when dark theme is set', async () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        const lightButton = screen.getByText('Set Light');
        const darkButton = screen.getByText('Set Dark');

        await act(async () => {
            lightButton.click();
        });

        await waitFor(() => {
            expect(document.documentElement.classList.contains('light')).toBe(true);
        });

        await act(async () => {
            darkButton.click();
        });

        await waitFor(() => {
            expect(document.documentElement.classList.contains('light')).toBe(false);
        });
    });

    it('should load theme from localStorage on mount', async () => {
        localStorageMock.setItem('theme', 'light');

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('light');
        });
    });

    it('should use system preference when no saved theme exists', async () => {
        // Mock prefers-color-scheme: light
        window.matchMedia = jest.fn().mockImplementation(query => ({
            matches: query === '(prefers-color-scheme: light)',
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        }));

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('light');
        });
    });
});
