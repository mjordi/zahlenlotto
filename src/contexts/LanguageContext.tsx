'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getTranslations, Translations } from '@/utils/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
    children,
    initialLanguage
}: {
    children: ReactNode;
    initialLanguage?: Language;
}) {
    // Initialize state with server-provided language or default
    const [language, setLanguageState] = useState<Language>(() => {
        if (initialLanguage) return initialLanguage;
        if (typeof window === 'undefined') return 'de';
        const dataLang = document.documentElement.getAttribute('data-language') as Language;
        if (dataLang && ['de', 'en', 'fr', 'it'].includes(dataLang)) {
            return dataLang;
        }
        return 'de';
    });

    // After hydration, sync with localStorage if not already set
    useEffect(() => {
        // 1. Check localStorage
        const savedLanguage = localStorage.getItem('language') as Language;
        if (savedLanguage && ['de', 'en', 'fr', 'it'].includes(savedLanguage)) {
            if (savedLanguage !== language) {
                setLanguageState(savedLanguage);
                // Ensure cookie is in sync
                document.cookie = `language=${savedLanguage}; path=/; max-age=31536000; SameSite=Lax`;
            }
            return;
        }

        // 2. Check browser language (only if no saved preference and no initial server language)
        if (!initialLanguage) {
            const browserLang = navigator.language.split('-')[0];
            if (['de', 'en', 'fr', 'it'].includes(browserLang)) {
                setLanguageState(browserLang as Language);
                document.cookie = `language=${browserLang}; path=/; max-age=31536000; SameSite=Lax`;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
        document.cookie = `language=${lang}; path=/; max-age=31536000; SameSite=Lax`;
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
