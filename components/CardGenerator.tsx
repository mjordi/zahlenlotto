'use client';

import { useState, useCallback, useRef } from 'react';
import LottoCard from './LottoCard';
import jsPDF from 'jspdf';

interface Card {
  id: number;
  grid: (number | null)[][];  // 3 Reihen × 9 Spalten
}

// Zahlen-Bereiche pro Spalte
const COLUMN_RANGES = [
  Array.from({ length: 9 }, (_, i) => i + 1),      // Spalte 0: 1-9
  Array.from({ length: 10 }, (_, i) => i + 10),    // Spalte 1: 10-19
  Array.from({ length: 10 }, (_, i) => i + 20),    // Spalte 2: 20-29
  Array.from({ length: 10 }, (_, i) => i + 30),    // Spalte 3: 30-39
  Array.from({ length: 10 }, (_, i) => i + 40),    // Spalte 4: 40-49
  Array.from({ length: 10 }, (_, i) => i + 50),    // Spalte 5: 50-59
  Array.from({ length: 10 }, (_, i) => i + 60),    // Spalte 6: 60-69
  Array.from({ length: 10 }, (_, i) => i + 70),    // Spalte 7: 70-79
  Array.from({ length: 11 }, (_, i) => i + 80),    // Spalte 8: 80-90
];

const COLUMN_LABELS = ['1-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-90'];

function generateLottoCard(): (number | null)[][] {
  // Initialisiere 3×9 Grid mit null
  const card: (number | null)[][] = Array(3).fill(null).map(() => Array(9).fill(null));

  // Für jede Reihe genau 5 zufällige Spalten auswählen
  for (let row = 0; row < 3; row++) {
    // Wähle 5 zufällige Spalten für diese Reihe
    const allColumns = Array.from({ length: 9 }, (_, i) => i);
    const selectedColumns = allColumns
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);

    for (const col of selectedColumns) {
      // Finde verfügbare Zahlen für diese Spalte (nicht bereits in anderen Reihen verwendet)
      const usedInColumn = card
        .map(r => r[col])
        .filter(n => n !== null) as number[];

      const available = COLUMN_RANGES[col].filter(n => !usedInColumn.includes(n));

      if (available.length > 0) {
        // Wähle zufällige Zahl aus verfügbaren
        const randomNumber = available[Math.floor(Math.random() * available.length)];
        card[row][col] = randomNumber;
      }
    }
  }

  // Sortiere Zahlen in jeder Spalte (kleinste oben)
  for (let col = 0; col < 9; col++) {
    // Sammle alle Zahlen in dieser Spalte mit ihren Reihen-Indizes
    const columnValues: { row: number; value: number }[] = [];
    for (let row = 0; row < 3; row++) {
      if (card[row][col] !== null) {
        columnValues.push({ row, value: card[row][col]! });
      }
    }

    // Sortiere nach Wert
    columnValues.sort((a, b) => a.value - b.value);

    // Sammle die ursprünglichen Reihen-Positionen (sortiert)
    const originalRows = columnValues.map(cv => cv.row).sort((a, b) => a - b);

    // Leere die Spalte
    for (let row = 0; row < 3; row++) {
      card[row][col] = null;
    }

    // Fülle sortiert wieder ein
    for (let i = 0; i < columnValues.length; i++) {
      card[originalRows[i]][col] = columnValues[i].value;
    }
  }

  return card;
}

export default function CardGenerator() {
  const [totalCards, setTotalCards] = useState(10);
  const [cardsPerPage, setCardsPerPage] = useState(3);
  const [generatedCards, setGeneratedCards] = useState<Card[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  const generateCards = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const cards: Card[] = [];
      for (let i = 0; i < totalCards; i++) {
        cards.push({
          id: i + 1,
          grid: generateLottoCard(),
        });
      }
      setGeneratedCards(cards);
      setIsGenerating(false);
    }, 100);
  }, [totalCards]);

  const exportToPDF = useCallback(() => {
    if (generatedCards.length === 0) return;

    setIsExporting(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const headerSpace = 45;
      const footerSpace = 20;

      const availableHeight = pageHeight - headerSpace - footerSpace - 2 * margin;
      const pages = Math.ceil(generatedCards.length / cardsPerPage);

      for (let pageNum = 0; pageNum < pages; pageNum++) {
        if (pageNum > 0) {
          pdf.addPage();
        }

        // Seitenkopf
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.setTextColor(30, 58, 138); // #1E3A8A
        const title = 'Zahlenlotto';
        const titleWidth = pdf.getTextWidth(title);
        pdf.text(title, (pageWidth - titleWidth) / 2, 25);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(102, 102, 102); // #666666
        const subtitle = 'Zahlen 1-90 • 5 Zahlen pro Reihe';
        const subtitleWidth = pdf.getTextWidth(subtitle);
        pdf.text(subtitle, (pageWidth - subtitleWidth) / 2, 35);

        // Seitennummer (wenn mehr als 1 Seite)
        if (pages > 1) {
          pdf.setFontSize(9);
          pdf.setTextColor(153, 153, 153); // #999999
          const pageText = `Seite ${pageNum + 1} von ${pages}`;
          const pageTextWidth = pdf.getTextWidth(pageText);
          pdf.text(pageText, pageWidth - margin - pageTextWidth, 15);
        }

        // Karten auf dieser Seite
        const startIdx = pageNum * cardsPerPage;
        const endIdx = Math.min(startIdx + cardsPerPage, generatedCards.length);
        const pageCards = generatedCards.slice(startIdx, endIdx);

        const cardOverhead = 18;
        const totalCardHeight = availableHeight / cardsPerPage;
        const cellHeight = (totalCardHeight - cardOverhead) / 3;
        const cellWidth = (pageWidth - 2 * margin) / 9;
        const startY = headerSpace + margin;

        for (let i = 0; i < pageCards.length; i++) {
          const card = pageCards[i];
          const cardY = startY + i * totalCardHeight;

          // Kartentitel
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.setTextColor(37, 99, 235); // #2563EB
          pdf.text(`Karte ${card.id}`, margin, cardY + 8);

          const tableWidth = 9 * cellWidth;
          const tableHeight = 3 * cellHeight;
          const tableY = cardY + 10;

          // Äußerer Rahmen
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(2);
          pdf.rect(margin, tableY, tableWidth, tableHeight);

          // Zellen zeichnen
          pdf.setLineWidth(0.5);
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 9; col++) {
              const cellX = margin + col * cellWidth;
              const cellY = tableY + row * cellHeight;
              const value = card.grid[row][col];

              // Zellhintergrund
              if (value === null) {
                pdf.setFillColor(211, 211, 211); // Grau für leere Felder
              } else {
                pdf.setFillColor(255, 255, 255); // Weiß für Zahlenfelder
              }
              pdf.rect(cellX, cellY, cellWidth, cellHeight, 'FD');

              // Zahl zeichnen
              if (value !== null) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(18);
                pdf.setTextColor(0, 0, 0);
                const numStr = value.toString();
                const numWidth = pdf.getTextWidth(numStr);
                pdf.text(numStr, cellX + (cellWidth - numWidth) / 2, cellY + cellHeight / 2 + 3);
              }
            }
          }

          // Spaltenüberschriften
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(102, 102, 102);
          for (let col = 0; col < 9; col++) {
            const label = COLUMN_LABELS[col];
            const labelWidth = pdf.getTextWidth(label);
            pdf.text(label, margin + col * cellWidth + (cellWidth - labelWidth) / 2, tableY + tableHeight + 4);
          }
        }

        // Fußzeile
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(136, 136, 136); // #888888
        const instructions = "Spielanleitung: Decke die gezogenen Zahlen ab. Wer zuerst eine Reihe voll hat, ruft 'LOTTO!'";
        const instructionsWidth = pdf.getTextWidth(instructions);
        pdf.text(instructions, (pageWidth - instructionsWidth) / 2, pageHeight - 12);
      }

      const totalCardsText = generatedCards.length;
      pdf.save(`zahlenlotto_${totalCardsText}_karten.pdf`);
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      alert('Fehler beim Erstellen der PDF-Datei');
    } finally {
      setIsExporting(false);
    }
  }, [generatedCards, cardsPerPage]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Einstellungen */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Einstellungen</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Anzahl Karten gesamt
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={totalCards}
              onChange={(e) => setTotalCards(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Jede Karte: 3 Reihen × 9 Spalten, 5 Zahlen pro Reihe
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Karten pro A4 Seite
            </label>
            <select
              value={cardsPerPage}
              onChange={(e) => setCardsPerPage(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="2">2 Karten</option>
              <option value="3">3 Karten</option>
              <option value="4">4 Karten</option>
              <option value="5">5 Karten</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={generateCards}
            disabled={isGenerating}
            className="flex-1 px-6 py-3 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white rounded-lg font-semibold shadow-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5"
          >
            {isGenerating ? 'Generiere...' : 'Karten generieren'}
          </button>

          {generatedCards.length > 0 && (
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="flex-1 px-6 py-3 bg-gradient-to-br from-[#16a34a] to-[#15803d] text-white rounded-lg font-semibold shadow-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5"
            >
              {isExporting ? 'Erstelle PDF...' : 'Als PDF herunterladen'}
            </button>
          )}
        </div>
      </div>

      {/* Vorschau */}
      {generatedCards.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Vorschau</h2>
            <span className="text-sm text-gray-600">
              {generatedCards.length} {generatedCards.length === 1 ? 'Karte' : 'Karten'} generiert
            </span>
          </div>

          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedCards.slice(0, 12).map((card) => (
              <LottoCard
                key={card.id}
                cardNumber={card.id}
                grid={card.grid}
                compact={cardsPerPage >= 4}
              />
            ))}
          </div>

          {generatedCards.length > 12 && (
            <p className="text-center text-gray-500 mt-4">
              ... und {generatedCards.length - 12} weitere Karten
            </p>
          )}
        </div>
      )}
    </div>
  );
}
