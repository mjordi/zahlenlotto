interface LottoCardProps {
  cardNumber: number;
  grid: (number | null)[][];  // 3 Reihen × 9 Spalten
  compact?: boolean;
}

const COLUMN_LABELS = ['1-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-90'];

export default function LottoCard({ cardNumber, grid, compact = false }: LottoCardProps) {
  const cellHeight = compact ? 'h-8' : 'h-12';
  const fontSize = compact ? 'text-sm' : 'text-lg';
  const titleSize = compact ? 'text-xs' : 'text-sm';
  const labelSize = compact ? 'text-[8px]' : 'text-xs';

  return (
    <div className="bg-white border-2 border-gray-800 rounded-lg p-3 print:border-black print:break-inside-avoid">
      {/* Kartentitel */}
      <div className={`text-center font-bold mb-2 text-[#2563EB] ${titleSize}`}>
        Karte {cardNumber}
      </div>

      {/* Zahlengrid (3 Reihen × 9 Spalten) */}
      <div className="border-2 border-black rounded">
        {grid.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-9">
            {row.map((cell, colIdx) => (
              <div
                key={colIdx}
                className={`
                  ${cellHeight} flex items-center justify-center
                  font-semibold ${fontSize}
                  border border-gray-400
                  ${cell === null ? 'bg-gray-300' : 'bg-white text-black'}
                  print:border-black
                `}
              >
                {cell !== null ? cell : ''}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Spaltenüberschriften */}
      <div className="grid grid-cols-9 mt-1">
        {COLUMN_LABELS.map((label, idx) => (
          <div
            key={idx}
            className={`text-center text-gray-600 ${labelSize}`}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
