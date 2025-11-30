'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const TOTAL_NUMBERS = 90;

export default function NumberDrawer() {
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [justDrawn, setJustDrawn] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

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
      if (!confirm('Spiel wirklich neu starten?')) {
        return;
      }
    }
    setDrawnNumbers([]);
    setCurrentNumber(null);
    setIsAnimating(false);
    setJustDrawn(null);
  }, [drawnNumbers.length]);

  // Tastatursteuerung
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        drawNumber();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        reset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawNumber, reset]);

  const isNumberDrawn = (num: number) => drawnNumbers.includes(num);
  const remainingNumbers = TOTAL_NUMBERS - drawnNumbers.length;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Sound Toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="fixed top-5 right-5 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-2xl transition-all duration-200 z-10"
        title="Ton ein/aus"
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>

      {/* Aktuelle Ziehung */}
      <div className="bg-white rounded-[20px] shadow-2xl p-8 text-center">
        <h2 className="text-[#1e3a8a] text-xl font-semibold mb-5">Aktuelle Ziehung</h2>

        {/* Große aktuelle Zahl */}
        <div className={`
          w-[140px] h-[140px] mx-auto rounded-full flex items-center justify-center
          font-bold shadow-lg transition-all duration-300
          ${isAnimating ? 'animate-spin-draw' : ''}
          ${currentNumber !== null
            ? 'bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-[#1e3a8a] text-6xl shadow-[0_8px_25px_rgba(245,158,11,0.4)]'
            : 'bg-gradient-to-br from-[#e2e8f0] to-[#cbd5e1] text-[#94a3b8] text-2xl'
          }
        `}>
          {currentNumber !== null ? currentNumber : '?'}
        </div>

        {/* Ziehungszähler */}
        <div className="text-[#64748b] mt-3">
          {drawnNumbers.length === 0
            ? 'Noch keine Zahl gezogen'
            : drawnNumbers.length === TOTAL_NUMBERS
            ? 'Alle 90 Zahlen wurden gezogen!'
            : `${drawnNumbers.length}. Ziehung`
          }
        </div>

        {/* Buttons */}
        <div className="flex gap-4 justify-center flex-wrap mt-5">
          <button
            onClick={drawNumber}
            disabled={drawnNumbers.length >= TOTAL_NUMBERS || isAnimating}
            className="px-9 py-4 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white rounded-xl font-semibold text-lg shadow-[0_4px_15px_rgba(37,99,235,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(37,99,235,0.5)] disabled:bg-[#94a3b8] disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
          >
            🎲 Zahl ziehen
          </button>
          <button
            onClick={reset}
            className="px-9 py-4 bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white rounded-xl font-semibold text-lg shadow-[0_4px_15px_rgba(239,68,68,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)]"
          >
            🔄 Neu starten
          </button>
        </div>
      </div>

      {/* Zahlenübersicht */}
      <div className="bg-white rounded-[20px] shadow-2xl p-6">
        <h2 className="text-center text-[#1e3a8a] text-xl font-semibold mb-5">
          Übersicht aller Zahlen (1-90)
        </h2>

        {/* Zahlen Grid */}
        <div className="grid grid-cols-10 gap-2 mb-5">
          {Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1).map(num => {
            const drawn = isNumberDrawn(num);
            const isJustDrawn = num === justDrawn;

            return (
              <div
                key={num}
                className={`
                  aspect-square flex items-center justify-center rounded-lg font-semibold text-base
                  transition-all duration-300
                  ${drawn
                    ? 'bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white shadow-[0_3px_10px_rgba(34,197,94,0.4)]'
                    : 'bg-[#f1f5f9] text-[#475569]'
                  }
                  ${isJustDrawn ? 'animate-pop' : ''}
                `}
              >
                {num}
              </div>
            );
          })}
        </div>

        {/* Statistik */}
        <div className="flex justify-center gap-8 flex-wrap">
          <div className="text-center">
            <div className="text-3xl font-bold text-[#1e3a8a]">{drawnNumbers.length}</div>
            <div className="text-[#64748b] text-sm">Gezogen</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#1e3a8a]">{remainingNumbers}</div>
            <div className="text-[#64748b] text-sm">Verbleibend</div>
          </div>
        </div>
      </div>

      {/* Gezogene Zahlen Liste */}
      <div className="bg-white rounded-[20px] shadow-2xl p-6">
        <h2 className="text-center text-[#1e3a8a] text-xl font-semibold mb-4">
          Gezogene Zahlen (Reihenfolge)
        </h2>
        <div className="flex flex-wrap gap-2.5 justify-center min-h-[50px] items-center">
          {drawnNumbers.length === 0 ? (
            <span className="text-[#94a3b8] italic">Noch keine Zahlen gezogen</span>
          ) : (
            drawnNumbers.map((num, idx) => (
              <div
                key={idx}
                className="w-11 h-11 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-full flex items-center justify-center font-bold text-[#1e3a8a] text-lg shadow-[0_3px_10px_rgba(245,158,11,0.3)]"
              >
                {num}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tastatur-Hinweis */}
      <div className="text-center text-white/60 text-sm">
        Tastatur: <kbd className="px-2 py-1 bg-white/10 rounded">Space</kbd> oder <kbd className="px-2 py-1 bg-white/10 rounded">Enter</kbd> = Ziehen | <kbd className="px-2 py-1 bg-white/10 rounded">R</kbd> = Reset
      </div>
    </div>
  );
}
