'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Language, getTranslations, Translations } from '@/utils/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window === 'undefined') return 'de';

        // 1. Check localStorage
        const savedLanguage = localStorage.getItem('language') as Language;
        if (savedLanguage && ['de', 'en', 'fr', 'it'].includes(savedLanguage)) {
            return savedLanguage;
        }

        // 2. Check browser language
        const browserLang = navigator.language.split('-')[0];
        if (['de', 'en', 'fr', 'it'].includes(browserLang)) {
            return browserLang as Language;
        }

        // 3. Default
        return 'de';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', lang);
        }
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
