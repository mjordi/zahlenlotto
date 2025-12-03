import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCompletedRows } from '@/utils/lotto';

interface LottoCardProps {
    cardNumber: number;
    grid: (number | null)[][];
    compact?: boolean;
    drawnNumbers?: number[];
}

export default function LottoCard({ cardNumber, grid, compact, drawnNumbers = [] }: LottoCardProps) {
    const { t } = useLanguage();
    const completedRows = getCompletedRows(grid, drawnNumbers);

    const isNumberDrawn = (num: number | null) => {
        return num !== null && drawnNumbers.includes(num);
    };

    return (
        <div className={`border border-white/10 rounded-lg p-4 bg-slate-900/50 shadow-inner ${compact ? 'text-xs' : ''}`}>
            <div className="text-blue-400 font-bold mb-2">{t.card} {cardNumber}</div>
            <div className="grid grid-rows-3 gap-0 border border-white/20 bg-slate-800">
                {grid.map((row, rowIndex) => {
                    const isRowCompleted = completedRows.includes(rowIndex);
                    return (
                        <div
                            key={rowIndex}
                            className={`grid grid-cols-9 ${isRowCompleted ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-400/20 to-emerald-500/20' : ''}`}
                        >
                            {row.map((num, colIndex) => {
                                const drawn = isNumberDrawn(num);
                                return (
                                    <div
                                        key={colIndex}
                                        className={`
                                            aspect-[3/4] flex items-center justify-center border border-white/10
                                            relative transition-all duration-300
                                            ${num !== null
                                                ? drawn
                                                    ? 'font-bold text-white bg-emerald-600 shadow-inner'
                                                    : 'font-bold text-slate-900 bg-white'
                                                : 'bg-slate-800/50'
                                            }
                                        `}
                                    >
                                        {num}
                                        {drawn && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-1 h-full bg-emerald-800/60 rotate-45"></div>
                                                <div className="w-1 h-full bg-emerald-800/60 -rotate-45 absolute"></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
