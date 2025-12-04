'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getTranslations, Translations } from '@/utils/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    // Read from data attribute set by blocking script, or default to 'de'
    // Using lazy initializer to ensure it only runs on client during hydration
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window === 'undefined') return 'de';
        const dataLang = document.documentElement.getAttribute('data-language') as Language;
        if (dataLang && ['de', 'en', 'fr', 'it'].includes(dataLang)) {
            return dataLang;
        }
        return 'de';
    });

    // After hydration, sync with localStorage if not already set
    useEffect(() => {
        // The blocking script already set the language from localStorage,
        // so we only need to check if there's a discrepancy or if no preference exists

        // 1. Check localStorage
        const savedLanguage = localStorage.getItem('language') as Language;
        if (savedLanguage && ['de', 'en', 'fr', 'it'].includes(savedLanguage)) {
            if (savedLanguage !== language) {
                setLanguageState(savedLanguage);
            }
            return;
        }

        // 2. Check browser language (only if no saved preference)
        const browserLang = navigator.language.split('-')[0];
        if (['de', 'en', 'fr', 'it'].includes(browserLang)) {
            setLanguageState(browserLang as Language);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
    };

    const t = getTranslations(language);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
