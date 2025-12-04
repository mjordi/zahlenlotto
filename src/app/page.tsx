'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/utils/translations';
import { Card } from '@/utils/lotto';
import ThemeToggle from '@/components/ThemeToggle';
import { SessionData, getSessionFromUrl, generateLottoCardWithSeed } from '@/utils/session';

import NumberDrawer from '@/components/NumberDrawer';

export default function Home() {
    const { language, setLanguage, t } = useLanguage();
    const [isLanguageOpen, setIsLanguageOpen] = useState(false);

    // Lifted state for NumberDrawer
    const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
    const [currentNumber, setCurrentNumber] = useState<number | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [generatedCards, setGeneratedCards] = useState<Card[]>([]);

    // Session state for shareable URLs
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [joinedFromUrl, setJoinedFromUrl] = useState(false);

    // Check for session in URL on mount
    useEffect(() => {
        const urlSession = getSessionFromUrl();
        if (urlSession) {
            setSessionData(urlSession);
            setJoinedFromUrl(true);

            // Generate cards from the session seed
            const cards: Card[] = [];
            let cardId = 1;
            for (let playerIdx = 0; playerIdx < urlSession.numberOfPlayers; playerIdx++) {
                for (let cardNum = 0; cardNum < urlSession.cardsPerPlayer; cardNum++) {
                    cards.push({
                        id: cardId,
                        grid: generateLottoCardWithSeed(urlSession.seed, cardId),
                        playerName: urlSession.playerNames[playerIdx]?.trim() || `${t.playerLabel} ${playerIdx + 1}`,
                    });
                    cardId++;
                }
            }
            setGeneratedCards(cards);

            // Clear URL params after loading to keep URL clean during gameplay
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [t.playerLabel]);

    const languages = SUPPORTED_LANGUAGES.map(lang => ({
        ...lang,
        label: t[lang.labelKey]
    }));

    return (
        <main className="min-h-screen p-4 md:p-8 pb-20">
            <div className="max-w-6xl mx-auto relative">
                {/* Theme and Language Selectors - Absolute position above headline */}
                <div className="absolute top-0 right-0 z-50 flex items-center gap-2 md:gap-3">
                    <ThemeToggle />
                    <div className="relative">
                        <button
                            onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                            aria-label={t.selectLanguage || 'Select language'}
                            aria-expanded={isLanguageOpen}
                            aria-haspopup="true"
                            className="bg-slate-800/95 backdrop-blur-md border border-white/30 rounded-xl px-4 py-3 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all cursor-pointer hover:bg-slate-700/95 hover:border-white/40 shadow-xl flex items-center gap-2"
                            style={{
                                background: 'var(--glass-bg)',
                                borderColor: 'var(--glass-border)',
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
                                className="absolute top-full mt-2 right-0 bg-slate-800/95 backdrop-blur-md border border-white/30 rounded-xl shadow-xl overflow-hidden min-w-[160px]"
                                style={{
                                    background: 'var(--glass-bg)',
                                    borderColor: 'var(--glass-border)'
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

                <header className="text-center mb-12 pt-16 md:pt-8">
                    <h1 className="text-3xl md:text-6xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-amber-400 filter drop-shadow-lg px-2">
                        {t.appTitle}
                    </h1>
                    <p className="text-lg px-2" style={{ color: 'var(--text-muted)' }}>{t.appSubtitle}</p>
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
                        sessionData={sessionData}
                        setSessionData={setSessionData}
                        joinedFromUrl={joinedFromUrl}
                    />
                </div>
            </div>
        </main>
    );
}
