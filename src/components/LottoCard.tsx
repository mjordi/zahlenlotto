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
        <div className={`card-container rounded-lg shadow-inner ${compact ? 'text-xs p-3' : 'p-4'}`}>
            <div className={`card-title font-bold ${compact ? 'mb-1.5 text-xs' : 'mb-2'}`}>{t.card} {cardNumber}</div>
            <div className="grid grid-rows-3 gap-0 card-grid-container">
                {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="grid grid-cols-9">
                        {row.map((num, colIndex) => (
                            <div
                                key={colIndex}
                                className={`
                  aspect-[3/4] flex items-center justify-center card-cell-border
                  ${num !== null ? 'card-cell-filled' : 'card-cell-empty'}
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
