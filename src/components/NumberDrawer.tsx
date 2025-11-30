'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const TOTAL_NUMBERS = 90;

interface NumberDrawerProps {
    drawnNumbers: number[];
    setDrawnNumbers: (numbers: number[] | ((prev: number[]) => number[])) => void;
    currentNumber: number | null;
    setCurrentNumber: (num: number | null) => void;
    soundEnabled: boolean;
    setSoundEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
}

export default function NumberDrawer({
    drawnNumbers,
    setDrawnNumbers,
    currentNumber,
    setCurrentNumber,
    soundEnabled,
    setSoundEnabled
}: NumberDrawerProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [justDrawn, setJustDrawn] = useState<number | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const { t } = useLanguage();

    // Audio Context initialisieren
    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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

    // Zahl ziehen
    const drawNumber = useCallback(() => {
        if (drawnNumbers.length >= TOTAL_NUMBERS || isAnimating) return;

        const availableNumbers = Array.from(
            { length: TOTAL_NUMBERS },
            (_, i) => i + 1
        ).filter(n => !drawnNumbers.includes(n));

        if (availableNumbers.length === 0) return;

        initAudio();
        setIsAnimating(true);
        const randomNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];

        setTimeout(() => {
            setCurrentNumber(randomNumber);
            setDrawnNumbers(prev => [...prev, randomNumber]);
            setJustDrawn(randomNumber);
            setIsAnimating(false);

            // Sound abspielen
            playSound(523.25 + (randomNumber * 5), 0.2);

            // Just-drawn Animation entfernen
            setTimeout(() => setJustDrawn(null), 500);
        }, 300);
    }, [drawnNumbers, isAnimating, initAudio, playSound]);

    // Reset mit Bestätigung
    const reset = useCallback(() => {
        if (drawnNumbers.length > 0) {
            if (!confirm(t.confirmRestart)) {
                return;
            }
        }
        setDrawnNumbers([]);
        setCurrentNumber(null);
        setIsAnimating(false);
        setJustDrawn(null);
    }, [drawnNumbers.length, t.confirmRestart]);

    // Tastatursteuerung
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                drawNumber();
            } else if (e.code === 'KeyR') {
                e.preventDefault();
                reset();
            } else if (e.code === 'KeyM') {
                e.preventDefault();
                setSoundEnabled(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [drawNumber, reset]);

    const isNumberDrawn = (num: number) => drawnNumbers.includes(num);
    const remainingNumbers = TOTAL_NUMBERS - drawnNumbers.length;

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
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
                <div className="text-slate-400 mt-4 font-medium">
                    {drawnNumbers.length === 0
                        ? t.noNumberDrawn
                        : drawnNumbers.length === TOTAL_NUMBERS
                            ? t.allDrawn
                            : `${drawnNumbers.length}${t.nthDrawing}`
                    }
                </div>

                {/* Buttons */}
                <div className="flex gap-4 justify-center flex-wrap mt-8">
                    <button
                        onClick={drawNumber}
                        disabled={drawnNumbers.length >= TOTAL_NUMBERS || isAnimating}
                        className="btn-primary px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t.drawNumber}
                    </button>
                    <button
                        onClick={reset}
                        className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 active:scale-95 border border-white/10"
                    >
                        {t.restart}
                    </button>
                </div>

                {/* Tastatur-Hinweis & Sound */}
                <div className="flex items-center justify-center gap-4 text-xs mt-6 border-t border-white/5 pt-4">
                    <div className="text-slate-500 leading-loose">
                        {t.keyboardHint} <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-300 font-sans inline-block my-1">{t.keySpace}</kbd> {t.keyDraw} | <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-300 font-sans inline-block my-1">{t.keyEnter}</kbd> {t.keyDraw} | <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-300 font-sans inline-block my-1">{t.keyR}</kbd> {t.keyReset} | <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-300 font-sans inline-block my-1">M</kbd> {t.muteToggle}
                    </div>
                </div>
            </div>

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
                                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-400/50 shadow-lg shadow-emerald-500/20 scale-105'
                                        : 'bg-slate-800/30 text-slate-600 border-white/5'
                                    }
                  ${isJustDrawn ? 'animate-bounce scale-125 z-10' : ''}
                `}
                            >
                                {num}
                            </div>
                        );
                    })}
                </div>

                {/* Statistik */}
                <div className="flex justify-center gap-12 flex-wrap border-t border-white/5 pt-6">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400">{drawnNumbers.length}</div>
                        <div className="text-slate-500 text-sm uppercase tracking-wider font-medium">{t.drawn}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-slate-400">{remainingNumbers}</div>
                        <div className="text-slate-500 text-sm uppercase tracking-wider font-medium">{t.remaining}</div>
                    </div>
                </div>
            </div>

            {/* Gezogene Zahlen Liste */}
            <div className="glass-panel p-6 md:p-8">
                <h2 className="text-center text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-amber-400">
                    {t.drawnNumbersList}
                </h2>
                <div className="flex flex-wrap gap-3 justify-center min-h-[50px] items-center">
                    {drawnNumbers.length === 0 ? (
                        <span className="text-slate-600 italic">{t.noNumbersDrawn}</span>
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
        </div>
    );
}
