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
    // Always start with 'auto' and 'dark' to avoid hydration mismatch
    const [themePreference, setThemePreferenceState] = useState<ThemePreference>('auto');
    const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>('dark');

    // Get system theme preference
    const getSystemTheme = (): AppliedTheme => {
        if (typeof window === 'undefined') return 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    // After hydration, update to saved preference or default to 'auto'
    useEffect(() => {
        // This effect runs once after hydration to sync client-side state
        // with localStorage/system preferences. This is necessary to avoid
        // hydration mismatches while still respecting user preferences.

        const savedPreference = localStorage.getItem('themePreference') as ThemePreference;

        if (savedPreference && ['light', 'dark', 'auto'].includes(savedPreference)) {
            setThemePreferenceState(savedPreference);

            // Apply theme based on preference
            const theme = savedPreference === 'auto' ? getSystemTheme() : savedPreference;
            setAppliedTheme(theme);
            document.documentElement.setAttribute('data-theme', theme);
        } else {
            // Default to 'auto' if no preference saved
            const systemTheme = getSystemTheme();
            setAppliedTheme(systemTheme);
            document.documentElement.setAttribute('data-theme', systemTheme);
        }
    }, []);

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
