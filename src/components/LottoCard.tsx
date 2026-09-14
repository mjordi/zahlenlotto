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
            className={`rounded-lg p-3 shadow-inner ${compact ? 'text-xs' : ''}`}
            style={{
                border: `1px solid var(--lotto-card-border)`,
                background: 'var(--lotto-card-bg)'
            }}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="font-display text-blue-500 font-bold text-sm">{t.card} {cardNumber}</div>
                {playerName && (
                    <div className="font-display text-amber-500 font-semibold text-xs truncate ml-2 max-w-[120px]">{playerName}</div>
                )}
            </div>
            <div
                className="grid grid-rows-3 gap-0 rounded overflow-hidden"
                style={{
                    border: `2px solid var(--lotto-card-border)`
                }}
            >
                {grid.map((row, rowIndex) => {
                    const isRowCompleted = completedRows.includes(rowIndex);
                    const isNewlyCompleted = newlyCompletedRows.includes(rowIndex);
                    return (
                        <div
                            key={rowIndex}
                            className={`grid grid-cols-9 ${isNewlyCompleted ? 'animate-pulse' : ''}`}
                        >
                            {row.map((num, colIndex) => {
                                const drawn = isNumberDrawn(num);
                                const drawnInCompletedRow = drawn && isRowCompleted;
                                return (
                                    <div
                                        key={colIndex}
                                        className={`
                                            aspect-[3/4] flex items-center justify-center
                                            relative transition-all duration-300 font-display
                                            ${compact ? 'text-xs sm:text-sm' : ''}
                                            ${num !== null
                                                ? drawn
                                                    ? drawnInCompletedRow
                                                        ? 'font-bold text-white shadow-inner'
                                                        : 'font-bold text-white shadow-inner'
                                                    : 'font-bold'
                                                : ''
                                            }
                                        `}
                                        style={
                                            num !== null
                                                ? drawn
                                                    ? drawnInCompletedRow
                                                        ? {
                                                            background: 'linear-gradient(to bottom right, #f59e0b, #d97706)',
                                                            border: `1px solid var(--lotto-card-border)`
                                                        }
                                                        : {
                                                            background: `linear-gradient(to bottom right, var(--lotto-drawn-from), var(--lotto-drawn-to))`,
                                                            border: `1px solid var(--lotto-card-border)`
                                                        }
                                                    : {
                                                        background: 'var(--lotto-cell-bg)',
                                                        color: 'var(--lotto-cell-text)',
                                                        border: `1px solid var(--lotto-card-border)`
                                                    }
                                                : isRowCompleted
                                                    ? {
                                                        background: 'rgba(245, 158, 11, 0.25)',
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
