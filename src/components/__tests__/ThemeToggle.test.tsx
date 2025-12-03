import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

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

// Mock navigator.language
Object.defineProperty(window.navigator, 'language', {
    writable: true,
    value: 'de',
});

describe('ThemeToggle', () => {
    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ThemeProvider>
                <LanguageProvider>
                    {ui}
                </LanguageProvider>
            </ThemeProvider>
        );
    };

    beforeEach(() => {
        localStorageMock.clear();
        document.documentElement.className = '';
    });

    it('should render the theme toggle button', () => {
        renderWithProviders(<ThemeToggle />);

        const button = screen.getByRole('button', { name: /thema wechseln/i });
        expect(button).toBeInTheDocument();
    });

    it('should show moon icon when theme is dark', () => {
        renderWithProviders(<ThemeToggle />);

        const button = screen.getByRole('button', { name: /thema wechseln/i });
        const svg = button.querySelector('svg');

        expect(svg).toBeInTheDocument();
        // Moon icon has a path with d="M21 12.79..."
        const moonPath = svg?.querySelector('path[d^="M21"]');
        expect(moonPath).toBeInTheDocument();
    });

    it('should show sun icon when theme is light', async () => {
        localStorageMock.setItem('theme', 'light');

        renderWithProviders(<ThemeToggle />);

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /thema wechseln/i });
            const svg = button.querySelector('svg');

            expect(svg).toBeInTheDocument();
            // Sun icon has a circle element
            const sunCircle = svg?.querySelector('circle');
            expect(sunCircle).toBeInTheDocument();
        });
    });

    it('should toggle theme when clicked', async () => {
        renderWithProviders(<ThemeToggle />);

        const button = screen.getByRole('button', { name: /thema wechseln/i });

        // Initially dark (moon icon)
        let svg = button.querySelector('svg');
        let moonPath = svg?.querySelector('path[d^="M21"]');
        expect(moonPath).toBeInTheDocument();

        // Click to switch to light
        await act(async () => {
            button.click();
        });

        await waitFor(() => {
            svg = button.querySelector('svg');
            const sunCircle = svg?.querySelector('circle');
            expect(sunCircle).toBeInTheDocument();
        });

        // Click again to switch back to dark
        await act(async () => {
            button.click();
        });

        await waitFor(() => {
            svg = button.querySelector('svg');
            moonPath = svg?.querySelector('path[d^="M21"]');
            expect(moonPath).toBeInTheDocument();
        });
    });

    it('should apply correct aria-label', () => {
        renderWithProviders(<ThemeToggle />);

        const button = screen.getByRole('button', { name: /thema wechseln/i });
        expect(button).toHaveAttribute('aria-label');
    });
});
