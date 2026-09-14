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
    generateHostToken,
    storeHostToken,
    getHostToken,
    setSeedInUrl,
} from '@/utils/session';
import { useGameSync, type CardConfig } from '@/hooks/useGameSync';

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
    const hasBaselinedRowsRef = useRef(false);

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
    const [showAllDrawn, setShowAllDrawn] = useState(false);
    const [showPdfDrawer, setShowPdfDrawer] = useState(false);

    // Track if we are the host (who started the session)
    const [isHost, setIsHost] = useState(!joinedFromUrl);

    // Secret that proves session ownership to the API. Hosts only - never shared.
    const [hostToken, setHostToken] = useState<string | null>(null);

    // Sync isHost with joinedFromUrl prop (handles async URL detection)
    useEffect(() => {
        if (joinedFromUrl) {
            setIsHost(false);
        }
    }, [joinedFromUrl]);

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
    const { claimSession, pushState, pushCardConfig, resetState, syncUnavailable, isHydrating } = useGameSync({
        seed: sessionData?.seed || null,
        hostToken,
        isHost,
        enabled: !!sessionData?.seed,
        pollingInterval: 2000,
        onStateUpdate: useCallback((numbers: number[], current: number | null) => {
            setDrawnNumbers(numbers);
            setCurrentNumber(current);
        }, [setDrawnNumbers, setCurrentNumber]),
        onCardConfigUpdate: useCallback((config: CardConfig) => {
            // Applies both to a guest receiving the host's cards and to a host
            // resuming after a refresh. Having no cards yet is what makes this
            // safe - it can never clobber cards already on screen.
            const seed = sessionData?.seed;
            if (seed && generatedCards.length === 0) {
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
        }, [sessionData, generatedCards.length, generateCardsFromConfig, setGeneratedCards]),
        onReset: useCallback(() => {
            setDrawnNumbers([]);
            setCurrentNumber(null);
        }, [setDrawnNumbers, setCurrentNumber]),
    });

    /**
     * Makes sure we hold a seed and host token before pushing to the server.
     * Registers both with the sync hook immediately, because a push can happen
     * before React re-renders with the newly created session.
     */
    const ensureHostSession = useCallback(() => {
        const existingSeed = sessionData?.seed;
        const seed = existingSeed ?? generateSessionSeed();
        const token = hostToken ?? getHostToken(seed) ?? generateHostToken();

        if (token !== hostToken) {
            storeHostToken(seed, token);
            setHostToken(token);
        }
        claimSession(seed, token);

        // The seed has to be in the URL for a refresh to resume this session
        // rather than start a new local game and strand the guests.
        setSeedInUrl(seed);

        return { seed, isNew: !existingSeed };
    }, [sessionData, hostToken, claimSession]);

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

            // Hide celebration after 3 seconds (also dismissible by click)
            setTimeout(() => {
                setShowCelebration(false);
                setCelebratingPlayers([]);
            }, 3000);
        }

        previousDrawnRef.current = newDrawnNumbers;
    }, [generatedCards, playCelebrationSound, triggerConfetti]);

    // Zahl ziehen (only host can draw)
    const drawNumber = useCallback(() => {
        // Guests cannot draw numbers
        if (!isHost) return;

        // Wait for the mount-time read: drawing off the pre-hydration board
        // would overwrite the history this session is being resumed from.
        if (isHydrating) return;

        if (drawnNumbers.length >= TOTAL_NUMBERS || isAnimating) return;

        const availableNumbers = Array.from(
            { length: TOTAL_NUMBERS },
            (_, i) => i + 1
        ).filter(n => !drawnNumbers.includes(n));

        if (availableNumbers.length === 0) return;

        // Claim the session (creating one on the first draw) before pushing
        const { seed, isNew } = ensureHostSession();
        if (isNew) {
            setSessionData({ seed, drawnNumbers: [] });
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

            // Just-drawn Animation entfernen
            setTimeout(() => setJustDrawn(null), 500);
        }, 300);
    }, [drawnNumbers, isAnimating, initAudio, playSound, setCurrentNumber, setDrawnNumbers, setSessionData, pushState, isHost, ensureHostSession, isHydrating]);

    /**
     * Row completion runs off the drawn numbers themselves, so guests receiving
     * numbers through sync get the same highlighting, confetti and celebration.
     * The first run only records a baseline: numbers drawn before we joined (or
     * before the cards existed) must not trigger a celebration on arrival.
     */
    useEffect(() => {
        if (generatedCards.length === 0) return;

        if (!hasBaselinedRowsRef.current) {
            hasBaselinedRowsRef.current = true;
            previousDrawnRef.current = drawnNumbers;
            return;
        }

        checkRowCompletion(drawnNumbers);
    }, [drawnNumbers, generatedCards, checkRowCompletion]);

    // Reset mit Bestätigung (only host can reset)
    const reset = useCallback(() => {
        // Guests cannot reset the game
        if (!isHost || isHydrating) return;

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
        ensureHostSession();
        resetState();
    }, [drawnNumbers.length, t.confirmRestart, setDrawnNumbers, setCurrentNumber, resetState, isHost, ensureHostSession, isHydrating]);

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
            // Claim the session first (reusing the seed of a draw-only session),
            // so the card config push below targets the right session.
            const { seed } = ensureHostSession();
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
    }, [numberOfPlayers, cardsPerPlayer, playerNames, setGeneratedCards, setSessionData, drawnNumbers, currentNumber, generateCardsFromConfig, pushCardConfig, ensureHostSession]);

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
                <h2 className="font-display text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-amber-400">{t.currentDrawing}</h2>

                {/* Große aktuelle Zahl */}
                <div className={`
          w-[160px] h-[160px] mx-auto rounded-full flex items-center justify-center
          font-display font-bold transition-all duration-500 border-4 relative
          ${isAnimating ? 'number-ball-spin' : ''}
          ${currentNumber !== null
                        ? `bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-white text-7xl border-amber-300/50 number-ball ${justDrawn !== null ? 'number-ball-reveal' : ''}`
                        : 'bg-gradient-to-br from-slate-700/50 to-slate-800/50 text-slate-500 text-3xl border-slate-600/30 number-ball-empty empty-ball-pulse'
                    }
        `}>
                    {currentNumber !== null && (
                        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                            <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/25 to-transparent" />
                        </div>
                    )}
                    <span className="relative z-10 drop-shadow-lg">{currentNumber !== null ? currentNumber : '?'}</span>
                </div>

                {/* Ziehungszähler */}
                <div className="mt-4 font-medium" style={{ color: 'var(--text-muted)' }}>
                    {drawnNumbers.length === 0
                        ? (
                            <span className="flex flex-col items-center gap-1">
                                <span>{t.noNumberDrawn}</span>
                                {/* Guests can neither press Space nor click to draw */}
                                {isHost && <span className="text-xs opacity-70">{t.emptyStateHint}</span>}
                            </span>
                        )
                        : drawnNumbers.length === TOTAL_NUMBERS
                            ? t.allDrawn
                            : `${drawnNumbers.length}${t.nthDrawing}`
                    }
                </div>

                {/* Sync failure - surfaced so a misconfigured deployment is not silent */}
                {syncUnavailable && sessionData && (
                    <div
                        className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30"
                        role="status"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <span className="text-sm font-medium">{t.syncUnavailable}</span>
                    </div>
                )}

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
                        disabled={drawnNumbers.length >= TOTAL_NUMBERS || isAnimating || !isHost || isHydrating}
                        className="btn-primary px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!isHost ? t.hostOnly : undefined}
                    >
                        {t.drawNumber}
                    </button>
                    <button
                        onClick={reset}
                        disabled={!isHost || isHydrating}
                        className="btn-danger px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="glass-panel p-6 md:p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
                    <h2 className="text-center font-display text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-400">
                        {t.allNumbersOverview}
                    </h2>

                    {/* Zahlen Grid with row labels on the side */}
                    <div className="mb-8">
                        {Array.from({ length: 9 }, (_, rowIdx) => {
                            const rowStart = rowIdx * 10 + 1;
                            const rowEnd = Math.min(rowStart + 9, TOTAL_NUMBERS);
                            const label = rowIdx < 8 ? `${rowStart}-${rowEnd}` : `${rowStart}-${TOTAL_NUMBERS}`;
                            return (
                                <div key={rowIdx} className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 last:mb-0">
                                    <div className="w-10 md:w-14 shrink-0 text-right text-[9px] md:text-[11px] font-medium pr-1" style={{ color: 'var(--text-muted)' }}>
                                        {label}
                                    </div>
                                    <div className="grid grid-cols-10 gap-1.5 md:gap-2 flex-1">
                                        {Array.from({ length: 10 }, (_, colIdx) => {
                                            const num = rowStart + colIdx;
                                            if (num > TOTAL_NUMBERS) return <div key={colIdx} />;
                                            const drawn = isNumberDrawn(num);
                                            const isJustDrawn = num === justDrawn;
                                            return (
                                                <div
                                                    key={num}
                                                    className={`
                                                        aspect-square flex items-center justify-center rounded-lg font-display font-semibold text-xs md:text-base
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
                                </div>
                            );
                        })}
                    </div>

                    {/* Statistik */}
                    <div className="flex justify-center gap-12 flex-wrap pt-6" style={{ borderTop: `1px solid var(--glass-border)` }}>
                        <div className="text-center">
                            <div className="font-display text-3xl font-bold text-emerald-500">{drawnNumbers.length}</div>
                            <div className="text-sm uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>{t.drawn}</div>
                        </div>
                        <div className="text-center">
                            <div className="font-display text-3xl font-bold" style={{ color: 'var(--text-secondary)' }}>{remainingNumbers}</div>
                            <div className="text-sm uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>{t.remaining}</div>
                        </div>
                    </div>
                </div>

                {/* Playing Cards Display or Generate Cards Prompt */}
                <div className="glass-panel p-6 md:p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
                    {generatedCards.length > 0 ? (
                        <>
                            <h2 className="text-center font-display text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
                                {t.playingCards}
                            </h2>
                            <div className="flex items-center justify-center gap-3 text-sm mb-4">
                                <span style={{ color: 'var(--text-muted)' }}>
                                    {generatedCards.length} {generatedCards.length === 1 ? t.card : t.cards}
                                </span>
                                <button
                                    onClick={() => setShowPdfDrawer(!showPdfDrawer)}
                                    className="btn-success text-xs flex items-center gap-1.5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    {t.exportPdf}
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

                            {/* Joined from URL notification */}
                            {joinedFromUrl && (
                                <div
                                    className="mb-4 text-center text-sm py-2 px-4 rounded-lg"
                                    style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-secondary)' }}
                                >
                                    {t.joinedSession}
                                </div>
                            )}

                            {/* PDF Export Drawer */}
                            {showPdfDrawer && (
                                <div className="mb-4 p-3 rounded-xl animate-slide-up" style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)' }}>
                                    <div className="flex gap-3 items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="cardsPerPageSelect" className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
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
                                            className="btn-primary text-sm py-2 px-4"
                                        >
                                            {isExporting ? t.creatingPdf : t.downloadPdf}
                                        </button>
                                    </div>
                                </div>
                            )}

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
                            <h2 className="text-center font-display text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
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
                                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="glass-panel p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
                <h2 className="text-center font-display text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">
                    {t.drawnNumbersList}
                </h2>
                <div className="flex flex-wrap gap-2 justify-center min-h-[50px] items-center">
                    {drawnNumbers.length === 0 ? (
                        <span className="italic" style={{ color: 'var(--text-muted)' }}>{t.noNumbersDrawn}</span>
                    ) : (
                        (showAllDrawn ? drawnNumbers : drawnNumbers.slice(-20)).map((num, idx) => {
                            const isLatest = !showAllDrawn
                                ? idx === Math.min(drawnNumbers.length, 20) - 1
                                : idx === drawnNumbers.length - 1;
                            return (
                                <div
                                    key={`${idx}-${num}`}
                                    className={`w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center font-display font-bold text-white text-sm shadow-md border border-amber-400/30 ${isLatest ? 'ring-2 ring-amber-400/50 scale-110' : ''}`}
                                >
                                    {num}
                                </div>
                            );
                        })
                    )}
                </div>
                {drawnNumbers.length > 20 && (
                    <div className="text-center mt-4">
                        <button
                            onClick={() => setShowAllDrawn(!showAllDrawn)}
                            className="text-sm font-medium transition-colors hover:underline"
                            style={{ color: 'var(--primary)' }}
                        >
                            {showAllDrawn ? t.showLess : `${t.showAll} (${drawnNumbers.length})`}
                        </button>
                    </div>
                )}
            </div>

            {/* Celebration Overlay */}
            {showCelebration && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-[10000] cursor-pointer"
                    role="alert"
                    aria-live="assertive"
                    onClick={() => {
                        setShowCelebration(false);
                        setCelebratingPlayers([]);
                    }}
                >
                    <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white px-12 md:px-16 py-10 md:py-12 rounded-3xl shadow-2xl border-4 border-white/30 animate-celebration pointer-events-none">
                        <div className="font-display text-5xl md:text-7xl font-bold tracking-wider drop-shadow-2xl text-center">
                            {t.lottoWin}
                        </div>
                        <div className="font-display text-xl md:text-2xl font-semibold mt-4 text-center text-white/90">
                            {celebratingPlayers.join(', ')}
                        </div>
                        <div className="text-base md:text-lg font-medium mt-2 text-center text-white/70">
                            {t.rowComplete}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
