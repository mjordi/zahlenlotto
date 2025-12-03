import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCompletedRows } from '@/utils/lotto';

interface LottoCardProps {
    cardNumber: number;
    grid: (number | null)[][];
    compact?: boolean;
    drawnNumbers?: number[];
    playerName?: string;
}

export default function LottoCard({ cardNumber, grid, compact, drawnNumbers = [], playerName }: LottoCardProps) {
    const { t } = useLanguage();
    const completedRows = getCompletedRows(grid, drawnNumbers);

    const isNumberDrawn = (num: number | null) => {
        return num !== null && drawnNumbers.includes(num);
    };

    return (
        <div className={`border border-white/10 rounded-lg p-4 bg-slate-900/50 shadow-inner ${compact ? 'text-xs' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="text-blue-400 font-bold">{t.card} {cardNumber}</div>
                {playerName && (
                    <div className="text-amber-400 font-semibold text-xs">{playerName}</div>
                )}
            </div>
            <div className="grid grid-rows-3 gap-0 border border-white/20 bg-slate-800">
                {grid.map((row, rowIndex) => {
                    const isRowCompleted = completedRows.includes(rowIndex);
                    return (
                        <div
                            key={rowIndex}
                            className={`grid grid-cols-9 ${isRowCompleted ? 'bg-gradient-to-r from-amber-500/40 via-amber-400/50 to-amber-500/40 animate-pulse' : ''}`}
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
