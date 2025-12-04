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

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Get system theme preference
    const getSystemTheme = (): AppliedTheme => {
        if (typeof window === 'undefined') return 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    // Read from data attributes set by blocking script, or use defaults
    // Using lazy initializers to ensure they only run on client during hydration
    const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
        if (typeof window === 'undefined') return 'auto';
        const savedPreference = localStorage.getItem('themePreference') as ThemePreference;
        if (savedPreference && ['light', 'dark', 'auto'].includes(savedPreference)) {
            return savedPreference;
        }
        return 'auto';
    });

    const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>(() => {
        if (typeof window === 'undefined') return 'dark';
        const dataTheme = document.documentElement.getAttribute('data-theme') as AppliedTheme;
        if (dataTheme && ['light', 'dark'].includes(dataTheme)) {
            return dataTheme;
        }
        return 'dark';
    });

    // After hydration, ensure consistency (should already be set by blocking script)
    useEffect(() => {
        // The blocking script already set data-theme attribute,
        // so we just need to ensure our state matches localStorage

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
            }
        } else {
            // Default to 'auto' if no preference saved
            const systemTheme = getSystemTheme();
            if (systemTheme !== appliedTheme) {
                setAppliedTheme(systemTheme);
                document.documentElement.setAttribute('data-theme', systemTheme);
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
