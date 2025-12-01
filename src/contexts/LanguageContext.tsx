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
    // Always start with 'de' to avoid hydration mismatch
    const [language, setLanguageState] = useState<Language>('de');

    // After hydration, update to saved or browser language
    useEffect(() => {
        // This effect runs once after hydration to sync client-side state
        // with localStorage/browser preferences. This is necessary to avoid
        // hydration mismatches while still respecting user preferences.

        // 1. Check localStorage
        const savedLanguage = localStorage.getItem('language') as Language;
        if (savedLanguage && ['de', 'en', 'fr', 'it'].includes(savedLanguage)) {
            setLanguageState(savedLanguage);
            return;
        }

        // 2. Check browser language
        const browserLang = navigator.language.split('-')[0];
        if (['de', 'en', 'fr', 'it'].includes(browserLang)) {
            setLanguageState(browserLang as Language);
        }
    }, []);

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
