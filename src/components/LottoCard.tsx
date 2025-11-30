import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LottoCardProps {
    cardNumber: number;
    grid: (number | null)[][];
    compact?: boolean;
}

export default function LottoCard({ cardNumber, grid, compact }: LottoCardProps) {
    const { t } = useLanguage();

    return (
        <div className={`border border-white/10 rounded-lg p-4 bg-slate-900/50 shadow-inner ${compact ? 'text-xs' : ''}`}>
            <div className="text-blue-400 font-bold mb-2">{t.card} {cardNumber}</div>
            <div className="grid grid-rows-3 gap-0 border border-white/20 bg-slate-800">
                {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="grid grid-cols-9">
                        {row.map((num, colIndex) => (
                            <div
                                key={colIndex}
                                className={`
                  aspect-[3/4] flex items-center justify-center border border-white/10
                  ${num !== null ? 'font-bold text-slate-900 bg-white' : 'bg-slate-800/50'}
                `}
                            >
                                {num}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
