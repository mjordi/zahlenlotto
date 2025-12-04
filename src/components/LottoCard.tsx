import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCompletedRows } from '@/utils/lotto';

interface LottoCardProps {
    cardNumber: number;
    grid: (number | null)[][];
    compact?: boolean;
    drawnNumbers?: number[];
    playerName?: string;
    newlyCompletedRows?: number[];
}

export default function LottoCard({ cardNumber, grid, compact, drawnNumbers = [], playerName, newlyCompletedRows = [] }: LottoCardProps) {
    const { t } = useLanguage();
    const completedRows = getCompletedRows(grid, drawnNumbers);

    const isNumberDrawn = (num: number | null) => {
        return num !== null && drawnNumbers.includes(num);
    };

    return (
        <div
            className={`rounded-lg p-4 shadow-inner ${compact ? 'text-xs' : ''}`}
            style={{
                border: `1px solid var(--lotto-card-border)`,
                background: 'var(--lotto-card-bg)'
            }}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="text-blue-500 font-bold">{t.card} {cardNumber}</div>
                {playerName && (
                    <div className="text-amber-500 font-semibold text-xs">{playerName}</div>
                )}
            </div>
            <div
                className="grid grid-rows-3 gap-0"
                style={{
                    border: `1px solid var(--lotto-card-border)`
                }}
            >
                {grid.map((row, rowIndex) => {
                    const isRowCompleted = completedRows.includes(rowIndex);
                    const isNewlyCompleted = newlyCompletedRows.includes(rowIndex);
                    return (
                        <div
                            key={rowIndex}
                            className={`grid grid-cols-9 ${isRowCompleted ? 'bg-gradient-to-r from-amber-500/40 via-amber-400/50 to-amber-500/40' : ''} ${isNewlyCompleted ? 'animate-pulse' : ''}`}
                        >
                            {row.map((num, colIndex) => {
                                const drawn = isNumberDrawn(num);
                                return (
                                    <div
                                        key={colIndex}
                                        className={`
                                            aspect-[3/4] flex items-center justify-center
                                            relative transition-all duration-300
                                            ${compact ? 'text-[11px] sm:text-xs' : ''}
                                            ${num !== null
                                                ? drawn
                                                    ? 'font-bold text-white bg-emerald-700 shadow-inner'
                                                    : 'font-bold'
                                                : ''
                                            }
                                        `}
                                        style={
                                            num !== null
                                                ? drawn
                                                    ? { border: `1px solid var(--lotto-card-border)` }
                                                    : {
                                                        background: 'var(--lotto-cell-bg)',
                                                        color: 'var(--lotto-cell-text)',
                                                        border: `1px solid var(--lotto-card-border)`
                                                    }
                                                : {
                                                    background: 'var(--lotto-cell-empty)',
                                                    border: `1px solid var(--lotto-card-border)`
                                                }
                                        }
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
