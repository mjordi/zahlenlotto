'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ThemeToggle() {
    const { themePreference, cycleTheme } = useTheme();
    const { t } = useLanguage();

    const getAriaLabel = () => {
        switch (themePreference) {
            case 'auto':
                return t.themeAuto;
            case 'light':
                return t.themeLight;
            case 'dark':
                return t.themeDark;
        }
    };

    const renderIcon = () => {
        switch (themePreference) {
            case 'auto':
                // Monitor/Auto icon
                return (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                        aria-hidden="true"
                    >
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                );
            case 'light':
                // Sun icon
                return (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                        aria-hidden="true"
                    >
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                );
            case 'dark':
                // Moon icon
                return (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                        aria-hidden="true"
                    >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                );
        }
    };

    return (
        <button
            onClick={cycleTheme}
            aria-label={getAriaLabel()}
            className="bg-slate-800/95 backdrop-blur-md border border-white/30 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all cursor-pointer hover:bg-slate-700/95 hover:border-white/40 shadow-xl"
            style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--foreground)'
            }}
        >
            {renderIcon()}
        </button>
    );
}
