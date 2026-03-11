'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/utils/translations';
import { Card } from '@/utils/lotto';
import ThemeToggle from '@/components/ThemeToggle';

import NumberDrawer from '@/components/NumberDrawer';

export default function Home() {
    const { language, setLanguage, t } = useLanguage();
    const [isLanguageOpen, setIsLanguageOpen] = useState(false);

    // Lifted state for NumberDrawer
    const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
    const [currentNumber, setCurrentNumber] = useState<number | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [generatedCards, setGeneratedCards] = useState<Card[]>([]);

    const languages = SUPPORTED_LANGUAGES.map(lang => ({
        ...lang,
        label: t[lang.labelKey]
    }));

    return (
        <main className="min-h-screen p-4 md:p-8 pb-20">
            <div className="max-w-6xl mx-auto">
                {/* Toolbar: Sound + Theme + Language */}
                <div className="flex items-center justify-end gap-2 md:gap-3 mb-4">
                    {/* Sound Toggle */}
                    <button
                        onClick={() => setSoundEnabled(prev => !prev)}
                        aria-label={soundEnabled ? t.soundOn : t.soundOff}
                        className="backdrop-blur-md rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer shadow-xl"
                        style={{
                            background: 'var(--glass-bg)',
                            borderColor: 'var(--glass-border)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--foreground)'
                        }}
                    >
                        {soundEnabled ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <line x1="23" y1="9" x2="17" y2="15"></line>
                                <line x1="17" y1="9" x2="23" y2="15"></line>
                            </svg>
                        )}
                    </button>

                    <ThemeToggle />

                    <div className="relative">
                        <button
                            onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                            aria-label={t.selectLanguage || 'Select language'}
                            aria-expanded={isLanguageOpen}
                            aria-haspopup="true"
                            className="backdrop-blur-md rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer shadow-xl flex items-center gap-2"
                            style={{
                                background: 'var(--glass-bg)',
                                borderColor: 'var(--glass-border)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--foreground)'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                                <path d="M2 12h20"></path>
                            </svg>
                        </button>

                        {isLanguageOpen && (
                            <div
                                className="absolute top-full mt-2 right-0 backdrop-blur-md rounded-xl shadow-xl overflow-hidden min-w-[160px] z-50"
                                style={{
                                    background: 'var(--glass-bg)',
                                    border: '1px solid var(--glass-border)'
                                }}
                                role="menu"
                                aria-orientation="vertical"
                            >
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            setLanguage(lang.code);
                                            setIsLanguageOpen(false);
                                        }}
                                        className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-2`}
                                        style={{
                                            backgroundColor: language === lang.code ? 'var(--btn-secondary-hover)' : 'transparent',
                                            color: 'var(--foreground)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (language !== lang.code) {
                                                e.currentTarget.style.backgroundColor = 'var(--btn-secondary-bg)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (language !== lang.code) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                        role="menuitem"
                                        aria-current={language === lang.code ? 'true' : undefined}
                                    >
                                        <span aria-hidden="true">{lang.flag}</span>
                                        <span className="text-base">{lang.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <header className="text-center mb-10">
                    <h1 className="font-display text-4xl md:text-7xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-amber-400 filter drop-shadow-lg px-2 tracking-tight">
                        {t.appTitle}
                    </h1>
                    <p className="text-base md:text-lg font-medium tracking-wide px-2" style={{ color: 'var(--text-muted)' }}>{t.appSubtitle}</p>
                </header>

                <div className="transition-all duration-500 ease-in-out">
                    <NumberDrawer
                        drawnNumbers={drawnNumbers}
                        setDrawnNumbers={setDrawnNumbers}
                        currentNumber={currentNumber}
                        setCurrentNumber={setCurrentNumber}
                        soundEnabled={soundEnabled}
                        setSoundEnabled={setSoundEnabled}
                        generatedCards={generatedCards}
                        setGeneratedCards={setGeneratedCards}
                    />
                </div>
            </div>
        </main>
    );
}
