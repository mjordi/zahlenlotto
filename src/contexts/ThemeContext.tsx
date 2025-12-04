'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | 'auto';
export type AppliedTheme = 'light' | 'dark';

interface ThemeContextType {
    themePreference: ThemePreference;
    appliedTheme: AppliedTheme;
    setThemePreference: (preference: ThemePreference) => void;
    cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
    children,
    initialTheme,
    initialThemePreference
}: {
    children: ReactNode;
    initialTheme?: AppliedTheme;
    initialThemePreference?: ThemePreference;
}) {
    // Get system theme preference
    const getSystemTheme = (): AppliedTheme => {
        if (typeof window === 'undefined') return 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    // Initialize state with server-provided theme or default
    const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
        if (initialThemePreference) return initialThemePreference;
        if (typeof window === 'undefined') return 'auto';
        const savedPreference = localStorage.getItem('themePreference') as ThemePreference;
        if (savedPreference && ['light', 'dark', 'auto'].includes(savedPreference)) {
            return savedPreference;
        }
        return 'auto';
    });

    const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>(() => {
        if (initialTheme) return initialTheme;
        if (typeof window === 'undefined') return 'dark';
        const dataTheme = document.documentElement.getAttribute('data-theme') as AppliedTheme;
        if (dataTheme && ['light', 'dark'].includes(dataTheme)) {
            return dataTheme;
        }
        return 'dark';
    });

    // Sync with localStorage and system preference on mount
    useEffect(() => {
        const savedPreference = localStorage.getItem('themePreference') as ThemePreference;

        if (savedPreference && ['light', 'dark', 'auto'].includes(savedPreference)) {
            if (savedPreference !== themePreference) {
                setThemePreferenceState(savedPreference);
            }

            // Apply theme based on preference
            const theme = savedPreference === 'auto' ? getSystemTheme() : savedPreference;
            if (theme !== appliedTheme) {
                setAppliedTheme(theme);
                document.documentElement.setAttribute('data-theme', theme);
                // Also update cookie to match
                document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
                document.cookie = `theme-preference=${savedPreference}; path=/; max-age=31536000; SameSite=Lax`;
            }
        } else {
            // Default to 'auto' if no preference saved
            // If we have an initialTheme from server (cookie), we might want to respect that
            // but if it's the first visit, we check system
            if (!initialTheme) {
                const systemTheme = getSystemTheme();
                if (systemTheme !== appliedTheme) {
                    setAppliedTheme(systemTheme);
                    document.documentElement.setAttribute('data-theme', systemTheme);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Listen for system theme changes when in auto mode
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            // Only update if preference is 'auto'
            if (themePreference === 'auto') {
                const newTheme = e.matches ? 'dark' : 'light';
                setAppliedTheme(newTheme);
                document.documentElement.setAttribute('data-theme', newTheme);
                document.cookie = `theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [themePreference]);

    const setThemePreference = (preference: ThemePreference) => {
        setThemePreferenceState(preference);
        localStorage.setItem('themePreference', preference);

        // Apply theme based on preference
        const theme = preference === 'auto' ? getSystemTheme() : preference;
        setAppliedTheme(theme);
        document.documentElement.setAttribute('data-theme', theme);

        // Set cookie for server-side rendering
        document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `theme-preference=${preference}; path=/; max-age=31536000; SameSite=Lax`;
    };

    const cycleTheme = () => {
        // Cycle: auto -> light -> dark -> auto
        const nextPreference: ThemePreference =
            themePreference === 'auto' ? 'light' :
                themePreference === 'light' ? 'dark' : 'auto';
        setThemePreference(nextPreference);
    };

    return (
        <ThemeContext.Provider value={{ themePreference, appliedTheme, setThemePreference, cycleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
