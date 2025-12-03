'use client';

import { useState, lazy, Suspense } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/utils/translations';
import { LottoCard } from '@/utils/lotto';

// Lazy load heavy components to reduce initial bundle
const NumberDrawer = lazy(() => import('@/components/NumberDrawer'));

interface Card {
    id: number;
    grid: LottoCard;
    playerId: number;
    playerName: string;
}

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
            <div className="max-w-6xl mx-auto relative">
                {/* Language Selector - Absolute position above headline */}
                <div className="absolute top-0 right-0 z-50">
                    <div className="relative">
                        <button
                            onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                            aria-label={t.selectLanguage || 'Select language'}
                            aria-expanded={isLanguageOpen}
                            aria-haspopup="true"
                            className="bg-slate-800/95 backdrop-blur-md border border-white/30 rounded-xl px-4 py-3 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all cursor-pointer hover:bg-slate-700/95 hover:border-white/40 shadow-xl flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                                <path d="M2 12h20"></path>
                            </svg>
                        </button>

                        {isLanguageOpen && (
                            <div className="absolute top-full mt-2 right-0 bg-slate-800/95 backdrop-blur-md border border-white/30 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            setLanguage(lang.code);
                                            setIsLanguageOpen(false);
                                        }}
                                        className={`w-full px-4 py-3 text-left hover:bg-slate-700/95 transition-colors flex items-center gap-2 ${language === lang.code ? 'bg-slate-700/50' : ''
                                            }`}
                                    >
                                        <span>{lang.flag}</span>
                                        <span className="text-white text-base">{lang.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <header className="text-center mb-12 pt-8">
                    <h1 className="text-4xl md:text-6xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-amber-400 filter drop-shadow-lg">
                        {t.appTitle}
                    </h1>
                    <p className="text-slate-400 text-lg">{t.appSubtitle}</p>
                </header>

                <div className="transition-all duration-500 ease-in-out">
                    <Suspense fallback={
                        <div className="glass-panel p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500/20 border-t-blue-500"></div>
                            <p className="mt-4 text-slate-400">Loading...</p>
                        </div>
                    }>
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
                    </Suspense>
                </div>
            </div>
        </main>
    );
}
