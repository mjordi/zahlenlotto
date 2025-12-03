'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Always start with 'dark' to avoid hydration mismatch
    const [theme, setThemeState] = useState<Theme>('dark');

    // After hydration, update to saved or system preference
    useEffect(() => {
        // This effect runs once after hydration to sync client-side state
        // with localStorage/system preferences. This is necessary to avoid
        // hydration mismatches while still respecting user preferences.

        // 1. Check localStorage
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
            setThemeState(savedTheme);
            document.documentElement.classList.toggle('light', savedTheme === 'light');
            return;
        }

        // 2. Check system preference
        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            setThemeState('light');
            document.documentElement.classList.add('light');
        }
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('light', newTheme === 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
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
