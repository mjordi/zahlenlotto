'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TOTAL_NUMBERS, Card, getNewlyCompletedRows } from '@/utils/lotto';
import LottoCard from './LottoCard';
import confetti from 'canvas-confetti';
import { generatePdf } from '@/utils/pdfGenerator';
import {
    SessionData,
    generateSessionSeed,
    generateLottoCardWithSeed,
    createShareableUrl,
} from '@/utils/session';
import { useGameSync } from '@/hooks/useGameSync';

interface NumberDrawerProps {
    drawnNumbers: number[];
    setDrawnNumbers: (numbers: number[] | ((prev: number[]) => number[])) => void;
    currentNumber: number | null;
    setCurrentNumber: (num: number | null) => void;
    soundEnabled: boolean;
    setSoundEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
    generatedCards: Card[];
    setGeneratedCards: (cards: Card[]) => void;
    sessionData: SessionData | null;
    setSessionData: (data: SessionData | null) => void;
    joinedFromUrl: boolean;
}

export default function NumberDrawer({
    drawnNumbers,
    setDrawnNumbers,
    currentNumber,
    setCurrentNumber,
    soundEnabled,
    setSoundEnabled,
    generatedCards,
    setGeneratedCards,
    sessionData,
    setSessionData,
    joinedFromUrl,
}: NumberDrawerProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [justDrawn, setJustDrawn] = useState<number | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const { t } = useLanguage();
    const previousDrawnRef = useRef<number[]>([]);

    // Card generation state
    const [numberOfPlayers, setNumberOfPlayers] = useState(2);
    const [cardsPerPlayer, setCardsPerPlayer] = useState(3);
    const [playerNames, setPlayerNames] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [cardsPerPage, setCardsPerPage] = useState(3);
    const [isExporting, setIsExporting] = useState(false);
    const [celebratingPlayers, setCelebratingPlayers] = useState<string[]>([]);
    const [newlyCompletedRowsByCard, setNewlyCompletedRowsByCard] = useState<Map<number, number[]>>(new Map());
    const [linkCopied, setLinkCopied] = useState(false);

    // Track if we are the host (who started the session)
    const [isHost, setIsHost] = useState(!joinedFromUrl);

    // Generate cards from config (used by both host and when receiving sync)
    const generateCardsFromConfig = useCallback((
        seed: string,
        numPlayers: number,
        numCardsPerPlayer: number,
        names: string[]
    ) => {
        const cards: Card[] = [];
        let cardId = 1;
        for (let playerIdx = 0; playerIdx < numPlayers; playerIdx++) {
            for (let cardNum = 0; cardNum < numCardsPerPlayer; cardNum++) {
                cards.push({
                    id: cardId,
                    grid: generateLottoCardWithSeed(seed, cardId),
                    playerName: names[playerIdx]?.trim() || `${t.playerLabel} ${playerIdx + 1}`,
                });
                cardId++;
            }
        }
        return cards;
    }, [t.playerLabel]);

    // Cross-device sync using the API + BroadcastChannel
    const { pushState, pushCardConfig, resetState } = useGameSync({
        seed: sessionData?.seed || null,
        isHost,
        enabled: !!sessionData?.seed,
        pollingInterval: 2000,
        onStateUpdate: useCallback((numbers: number[], current: number | null) => {
            setDrawnNumbers(numbers);
            setCurrentNumber(current);
        }, [setDrawnNumbers, setCurrentNumber]),
        onCardConfigUpdate: useCallback((config: { numberOfPlayers: number; cardsPerPlayer: number; playerNames: string[] }) => {
            // Only update cards if we're a guest and don't already have cards
            const seed = sessionData?.seed;
            if (!isHost && seed && generatedCards.length === 0) {
                const cards = generateCardsFromConfig(
                    seed,
                    config.numberOfPlayers,
                    config.cardsPerPlayer,
                    config.playerNames
                );
                setGeneratedCards(cards);
                setNumberOfPlayers(config.numberOfPlayers);
                setCardsPerPlayer(config.cardsPerPlayer);
                setPlayerNames(config.playerNames);
            }
        }, [isHost, sessionData, generatedCards.length, generateCardsFromConfig, setGeneratedCards]),
        onReset: useCallback(() => {
            setDrawnNumbers([]);
            setCurrentNumber(null);
        }, [setDrawnNumbers, setCurrentNumber]),
    });

    // Audio Context initialisieren
    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            audioCtxRef.current = new AudioContextClass();
        }
    }, []);

    // Sound abspielen
    const playSound = useCallback((frequency: number, duration: number) => {
        if (!soundEnabled || !audioCtxRef.current) return;

        const oscillator = audioCtxRef.current.createOscillator();
        const gainNode = audioCtxRef.current.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + duration);

        oscillator.start(audioCtxRef.current.currentTime);
        oscillator.stop(audioCtxRef.current.currentTime + duration);
    }, [soundEnabled]);

    // Celebration sound - cheering melody
    const playCelebrationSound = useCallback(() => {
        if (!soundEnabled || !audioCtxRef.current) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const duration = 0.15;

        notes.forEach((frequency, index) => {
            setTimeout(() => {
                playSound(frequency, duration);
            }, index * 150);
        });
    }, [soundEnabled, playSound]);

    // Trigger confetti animation
    const triggerConfetti = useCallback(() => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10001 };

        function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min;
        }

        const interval: NodeJS.Timeout = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    }, []);

    // Check for row completion
    const checkRowCompletion = useCallback((newDrawnNumbers: number[]) => {
        if (generatedCards.length === 0) return;

        const previousDrawn = previousDrawnRef.current;
        const playersWithNewCompletion: string[] = [];
        const newCompletionsByCard = new Map<number, number[]>();

        for (const card of generatedCards) {
            const newlyCompletedRows = getNewlyCompletedRows(card.grid, previousDrawn, newDrawnNumbers);

            if (newlyCompletedRows.length > 0) {
                newCompletionsByCard.set(card.id, newlyCompletedRows);

                const name = card.playerName || '';
                if (name && !playersWithNewCompletion.includes(name)) {
                    playersWithNewCompletion.push(name);
                }
            }
        }

        // Update state with newly completed rows
        setNewlyCompletedRowsByCard(newCompletionsByCard);

        if (playersWithNewCompletion.length > 0) {
            setCelebratingPlayers(playersWithNewCompletion);
            setShowCelebration(true);
            playCelebrationSound();
            triggerConfetti();

            // Hide celebration after 5 seconds
            setTimeout(() => {
                setShowCelebration(false);
                setCelebratingPlayers([]);
            }, 5000);
        }

        previousDrawnRef.current = newDrawnNumbers;
    }, [generatedCards, playCelebrationSound, triggerConfetti]);

    // Zahl ziehen (only host can draw)
    const drawNumber = useCallback(() => {
        // Guests cannot draw numbers
        if (!isHost && sessionData) return;

        if (drawnNumbers.length >= TOTAL_NUMBERS || isAnimating) return;

        const availableNumbers = Array.from(
            { length: TOTAL_NUMBERS },
            (_, i) => i + 1
        ).filter(n => !drawnNumbers.includes(n));

        if (availableNumbers.length === 0) return;

        // Create a session if this is the first draw and no session exists
        if (!sessionData) {
            const seed = generateSessionSeed();
            const newSession: SessionData = {
                seed,
                drawnNumbers: [],
            };
            setSessionData(newSession);
            setIsHost(true);
        }

        initAudio();
        setIsAnimating(true);
        const randomNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];

        setTimeout(() => {
            const newDrawnNumbers = [...drawnNumbers, randomNumber];
            setCurrentNumber(randomNumber);
            setDrawnNumbers(newDrawnNumbers);
            setJustDrawn(randomNumber);
            setIsAnimating(false);

            // Push state to server for cross-device sync (also broadcasts to same-browser tabs)
            pushState(newDrawnNumbers, randomNumber);

            // Sound abspielen
            playSound(523.25 + (randomNumber * 5), 0.2);

            // Check for row completion
            checkRowCompletion(newDrawnNumbers);

            // Just-drawn Animation entfernen
            setTimeout(() => setJustDrawn(null), 500);
        }, 300);
    }, [drawnNumbers, isAnimating, initAudio, playSound, setCurrentNumber, setDrawnNumbers, checkRowCompletion, sessionData, setSessionData, pushState, isHost]);

    // Reset mit Bestätigung (only host can reset)
    const reset = useCallback(() => {
        // Guests cannot reset the game
        if (!isHost) return;

        if (drawnNumbers.length > 0) {
            if (!confirm(t.confirmRestart)) {
                return;
            }
        }
        setDrawnNumbers([]);
        setCurrentNumber(null);
        setIsAnimating(false);
        setJustDrawn(null);
        setShowCelebration(false);
        setNewlyCompletedRowsByCard(new Map());
        previousDrawnRef.current = [];

        // Reset state on server (also broadcasts to same-browser tabs)
        resetState();
    }, [drawnNumbers.length, t.confirmRestart, setDrawnNumbers, setCurrentNumber, resetState, isHost]);

    // Tastatursteuerung (draw/reset only work for host)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts if user is typing in an input field
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                if (isHost) drawNumber();
            } else if (e.code === 'KeyR') {
                e.preventDefault();
                if (isHost) reset();
            } else if (e.code === 'KeyM') {
                e.preventDefault();
                setSoundEnabled(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [drawNumber, reset, setSoundEnabled, isHost]);

    // Update player names when number of players changes
    useEffect(() => {
        setPlayerNames(prev => {
            const newNames = [...prev];
            while (newNames.length < numberOfPlayers) {
                newNames.push('');
            }
            return newNames.slice(0, numberOfPlayers);
        });
    }, [numberOfPlayers]);

    const isNumberDrawn = (num: number) => drawnNumbers.includes(num);
    const remainingNumbers = TOTAL_NUMBERS - drawnNumbers.length;

    // Generate cards function with seeded randomness for shareable URLs
    const generateCards = useCallback(() => {
        setIsGenerating(true);
        setTimeout(() => {
            // Generate a new session seed (or reuse existing if already in a draw-only session)
            const seed = sessionData?.seed || generateSessionSeed();
            const trimmedNames = playerNames.slice(0, numberOfPlayers);
            const newSession: SessionData = {
                seed,
                drawnNumbers,
                numberOfPlayers,
                cardsPerPlayer,
                playerNames: trimmedNames,
            };
            setSessionData(newSession);
            setIsHost(true); // Generating cards makes you the host

            const cards = generateCardsFromConfig(seed, numberOfPlayers, cardsPerPlayer, trimmedNames);
            setGeneratedCards(cards);
            setIsGenerating(false);

            // Push card configuration to server for guests to receive
            pushCardConfig(
                { numberOfPlayers, cardsPerPlayer, playerNames: trimmedNames },
                drawnNumbers,
                currentNumber
            );
        }, 100);
    }, [numberOfPlayers, cardsPerPlayer, playerNames, setGeneratedCards, setSessionData, sessionData?.seed, drawnNumbers, currentNumber, generateCardsFromConfig, pushCardConfig]);

    // Export to PDF function
    const exportToPDF = useCallback(() => {
        if (generatedCards.length === 0) return;

        setIsExporting(true);

        // Allow UI to update before blocking with PDF generation
        setTimeout(() => {
            generatePdf(generatedCards, t, { cardsPerPage });
            setIsExporting(false);
        }, 10);
    }, [generatedCards, cardsPerPage, t]);

    // Copy share link to clipboard
    const copyShareLink = useCallback(async () => {
        if (!sessionData) return;

        // Include current drawn numbers in the shareable URL
        const sessionWithCurrentState: SessionData = {
            ...sessionData,
            drawnNumbers,
        };

        const url = createShareableUrl(sessionWithCurrentState);
        try {
            await navigator.clipboard.writeText(url);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        }
    }, [sessionData, drawnNumbers]);

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 relative">
            {/* Aktuelle Ziehung */}
            <div className="glass-panel p-6 md:p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-amber-400">{t.currentDrawing}</h2>

                {/* Große aktuelle Zahl */}
                <div className={`
          w-[140px] h-[140px] mx-auto rounded-full flex items-center justify-center
          font-bold shadow-2xl transition-all duration-500 border-4
          ${isAnimating ? 'animate-pulse scale-110' : ''}
          ${currentNumber !== null
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white text-6xl border-amber-300/50 shadow-amber-500/40'
                        : 'bg-slate-800/50 text-slate-600 text-2xl border-slate-700/50'
                    }
        `}>
                    {currentNumber !== null ? currentNumber : '?'}
                </div>

                {/* Ziehungszähler */}
                <div className="mt-4 font-medium" style={{ color: 'var(--text-muted)' }}>
                    {drawnNumbers.length === 0
                        ? t.noNumberDrawn
                        : drawnNumbers.length === TOTAL_NUMBERS
                            ? t.allDrawn
                            : `${drawnNumbers.length}${t.nthDrawing}`
                    }
                </div>

                {/* Spectator Mode Indicator */}
                {!isHost && sessionData && (
                    <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <span className="text-sm font-medium">{t.spectatorMode}</span>
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-4 justify-center flex-wrap mt-8">
                    <button
                        onClick={drawNumber}
                        disabled={drawnNumbers.length >= TOTAL_NUMBERS || isAnimating || !isHost}
                        className="btn-primary px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!isHost ? t.hostOnly : undefined}
                    >
                        {t.drawNumber}
                    </button>
                    <button
                        onClick={reset}
                        disabled={!isHost}
                        className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 active:scale-95 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                        title={!isHost ? t.hostOnly : undefined}
                    >
                        {t.restart}
                    </button>
                    {sessionData && isHost && (
                        <button
                            onClick={copyShareLink}
                            className="px-8 py-4 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 flex items-center gap-2"
                            title={t.shareGameDescription}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                <polyline points="16 6 12 2 8 6"></polyline>
                                <line x1="12" y1="2" x2="12" y2="15"></line>
                            </svg>
                            {linkCopied ? t.linkCopied : t.shareGame}
                        </button>
                    )}
                </div>

                {/* Tastatur-Hinweis & Sound (only show draw/reset for host) */}
                <div className="flex items-center justify-center gap-4 text-xs mt-6 pt-4" style={{ borderTop: `1px solid var(--glass-border)` }}>
                    <div className="leading-loose" style={{ color: 'var(--text-muted)' }}>
                        {isHost ? (
                            <>
                                {t.keyboardHint} <kbd className="px-1.5 py-0.5 rounded border font-sans inline-block my-1" style={{ background: 'var(--btn-secondary-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>{t.keySpace}</kbd> {t.keyDraw} | <kbd className="px-1.5 py-0.5 rounded border font-sans inline-block my-1" style={{ background: 'var(--btn-secondary-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>{t.keyEnter}</kbd> {t.keyDraw} | <kbd className="px-1.5 py-0.5 rounded border font-sans inline-block my-1" style={{ background: 'var(--btn-secondary-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>{t.keyR}</kbd> {t.keyReset} | <kbd className="px-1.5 py-0.5 rounded border font-sans inline-block my-1" style={{ background: 'var(--btn-secondary-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>M</kbd> {t.muteToggle}
                            </>
                        ) : (
                            <>
                                {t.keyboardHint} <kbd className="px-1.5 py-0.5 rounded border font-sans inline-block my-1" style={{ background: 'var(--btn-secondary-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>M</kbd> {t.muteToggle}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Two Column Layout: Numbers Overview and Playing Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Zahlenübersicht */}
                <div className="glass-panel p-6 md:p-8">
                    <h2 className="text-center text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-amber-400">
                        {t.allNumbersOverview}
                    </h2>

                    {/* Zahlen Grid */}
                    <div className="grid grid-cols-10 gap-2 mb-8">
                        {Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1).map(num => {
                            const drawn = isNumberDrawn(num);
                            const isJustDrawn = num === justDrawn;

                            return (
                                <div
                                    key={num}
                                    className={`
                      aspect-square flex items-center justify-center rounded-lg font-semibold text-sm md:text-base
                      transition-all duration-500 border
                      ${drawn
                                            ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-emerald-400/50 shadow-lg shadow-emerald-500/20 scale-105'
                                            : 'border'
                                        }
                      ${isJustDrawn ? 'animate-bounce scale-125 z-10' : ''}
                    `}
                                    style={!drawn ? {
                                        background: 'var(--lotto-cell-empty)',
                                        color: 'var(--text-muted)',
                                        borderColor: 'var(--glass-border)'
                                    } : {}}
                                >
                                    {num}
                                </div>
                            );
                        })}
                    </div>

                    {/* Statistik */}
                    <div className="flex justify-center gap-12 flex-wrap pt-6" style={{ borderTop: `1px solid var(--glass-border)` }}>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-500">{drawnNumbers.length}</div>
                            <div className="text-sm uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>{t.drawn}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold" style={{ color: 'var(--text-secondary)' }}>{remainingNumbers}</div>
                            <div className="text-sm uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>{t.remaining}</div>
                        </div>
                    </div>
                </div>

                {/* Playing Cards Display or Generate Cards Prompt */}
                <div className="glass-panel p-6 md:p-8">
                    {generatedCards.length > 0 ? (
                        <>
                            <h2 className="text-center text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-amber-400">
                                {t.playingCards}
                            </h2>
                            <div className="text-center text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                                {generatedCards.length} {generatedCards.length === 1 ? t.card : t.cards}
                            </div>

                            {/* Joined from URL notification */}
                            {joinedFromUrl && (
                                <div
                                    className="mb-4 text-center text-sm py-2 px-4 rounded-lg"
                                    style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-secondary)' }}
                                >
                                    {t.joinedSession}
                                </div>
                            )}

                            {/* PDF Export and Share Controls */}
                            <div className="mb-4 flex flex-wrap gap-3 items-center justify-center">
                                <div className="flex items-center gap-2">
                                    <label htmlFor="cardsPerPageSelect" className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                        {t.cardsPerPage}:
                                    </label>
                                    <select
                                        id="cardsPerPageSelect"
                                        value={cardsPerPage}
                                        onChange={(e) => setCardsPerPage(parseInt(e.target.value))}
                                        className="input-field text-sm py-1 px-2"
                                        aria-label={t.cardsPerPage}
                                    >
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                        <option value="5">5</option>
                                    </select>
                                </div>
                                <button
                                    onClick={exportToPDF}
                                    disabled={isExporting}
                                    className="px-4 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isExporting ? t.creatingPdf : t.downloadPdf}
                                </button>
                                {sessionData && isHost && (
                                    <button
                                        onClick={copyShareLink}
                                        className="px-4 py-1 bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 flex items-center gap-2"
                                        title={t.shareGameDescription}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                            <polyline points="16 6 12 2 8 6"></polyline>
                                            <line x1="12" y1="2" x2="12" y2="15"></line>
                                        </svg>
                                        {linkCopied ? t.linkCopied : t.shareGame}
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                                {generatedCards.map((card) => (
                                    <LottoCard
                                        key={card.id}
                                        cardNumber={card.id}
                                        grid={card.grid}
                                        drawnNumbers={drawnNumbers}
                                        playerName={card.playerName}
                                        newlyCompletedRows={newlyCompletedRowsByCard.get(card.id) || []}
                                        compact
                                    />
                                ))}
                            </div>
                        </>
                    ) : !isHost && sessionData ? (
                        // Guest waiting for cards
                        <>
                            <h2 className="text-center text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-amber-400">
                                {t.playingCards}
                            </h2>
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="animate-pulse text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} aria-hidden="true">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    <p style={{ color: 'var(--text-muted)' }}>{t.waitingForCards}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        // Host can generate cards
                        <>
                            <h2 className="text-center text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-amber-400">
                                {t.tabGenerateCards}
                            </h2>
                            <div className="flex flex-col items-center justify-center">
                                <div className="w-full max-w-sm space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="numberOfPlayers" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                                {t.numberOfPlayers}
                                            </label>
                                            <input
                                                id="numberOfPlayers"
                                                type="number"
                                                min="1"
                                                max="20"
                                                value={numberOfPlayers}
                                                onChange={(e) => setNumberOfPlayers(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                                                className="input-field w-full"
                                                aria-label={t.numberOfPlayers}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="cardsPerPlayer" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                                {t.cardsPerPlayer}
                                            </label>
                                            <input
                                                id="cardsPerPlayer"
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={cardsPerPlayer}
                                                onChange={(e) => setCardsPerPlayer(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                                                className="input-field w-full"
                                                aria-label={t.cardsPerPlayer}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                                        {Array.from({ length: numberOfPlayers }, (_, i) => (
                                            <div key={i}>
                                                <label htmlFor={`playerName-${i}`} className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                                                    {t.playerLabel} {i + 1}
                                                </label>
                                                <input
                                                    id={`playerName-${i}`}
                                                    type="text"
                                                    value={playerNames[i] || ''}
                                                    onChange={(e) => {
                                                        const newNames = [...playerNames];
                                                        newNames[i] = e.target.value;
                                                        setPlayerNames(newNames);
                                                    }}
                                                    placeholder={`${t.playerLabel} ${i + 1}`}
                                                    className="input-field w-full text-sm"
                                                    aria-label={`${t.playerLabel} ${i + 1}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={generateCards}
                                        disabled={isGenerating}
                                        className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={isGenerating ? t.generating : t.generateCards}
                                    >
                                        {isGenerating ? t.generating : t.generateCards}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Gezogene Zahlen Liste */}
            <div className="glass-panel p-6 md:p-8">
                <h2 className="text-center text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-amber-400">
                    {t.drawnNumbersList}
                </h2>
                <div className="flex flex-wrap gap-3 justify-center min-h-[50px] items-center">
                    {drawnNumbers.length === 0 ? (
                        <span className="italic" style={{ color: 'var(--text-muted)' }}>{t.noNumbersDrawn}</span>
                    ) : (
                        drawnNumbers.map((num, idx) => (
                            <div
                                key={idx}
                                className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg border border-amber-300/30 animate-draw"
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                {num}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Celebration Overlay */}
            {showCelebration && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-[10000] pointer-events-none"
                    role="alert"
                    aria-live="assertive"
                >
                    <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white px-16 py-12 rounded-3xl shadow-2xl border-4 border-white/30 animate-bounce">
                        <div className="text-7xl font-black tracking-wider drop-shadow-2xl">
                            {t.lottoWin}
                        </div>
                        <div className="text-2xl font-semibold mt-4 text-center text-white/90">
                            {celebratingPlayers.join(', ')}
                        </div>
                        <div className="text-xl font-medium mt-2 text-center text-white/80">
                            {t.rowComplete}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
