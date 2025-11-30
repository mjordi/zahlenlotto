'use client';

import { useState, useCallback, useRef } from 'react';
import LottoCard from './LottoCard';
import { jsPDF } from 'jspdf';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateLottoCard, COLUMN_LABELS, LottoCard as LottoCardType } from '@/utils/lotto';

interface Card {
    id: number;
    grid: LottoCardType;
}

export default function CardGenerator() {
    const [totalCards, setTotalCards] = useState(10);
    const [cardsPerPage, setCardsPerPage] = useState(3);
    const [generatedCards, setGeneratedCards] = useState<Card[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const cardsRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();

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
                const title = t.pdfTitle;
                const titleWidth = pdf.getTextWidth(title);
                pdf.text(title, (pageWidth - titleWidth) / 2, 25);

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(11);
                pdf.setTextColor(102, 102, 102); // #666666
                const subtitle = t.pdfSubtitle;
                const subtitleWidth = pdf.getTextWidth(subtitle);
                pdf.text(subtitle, (pageWidth - subtitleWidth) / 2, 35);

                // Seitennummer (wenn mehr als 1 Seite)
                if (pages > 1) {
                    pdf.setFontSize(9);
                    pdf.setTextColor(153, 153, 153); // #999999
                    const pageText = `${t.pdfPageOf} ${pageNum + 1} ${t.pdfPageOf} ${pages}`;
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
                    pdf.text(`${t.card} ${card.id}`, margin, cardY + 8);

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
                const instructions = t.pdfInstructions;
                const instructionsWidth = pdf.getTextWidth(instructions);
                pdf.text(instructions, (pageWidth - instructionsWidth) / 2, pageHeight - 12);
            }

            const totalCardsText = generatedCards.length;
            pdf.save(`${t.pdfTitle.toLowerCase()}_${totalCardsText}_${t.cards.toLowerCase()}.pdf`);
        } catch (error) {
            console.error('Fehler beim PDF-Export:', error);
            alert('Fehler beim Erstellen der PDF-Datei');
        } finally {
            setIsExporting(false);
        }
    }, [generatedCards, cardsPerPage, t]);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Einstellungen */}
            <div className="glass-panel p-6 md:p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
                <h2 className="text-center text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-amber-400">{t.settings}</h2>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            {t.totalCards}
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={totalCards}
                            onChange={(e) => setTotalCards(Math.max(1, parseInt(e.target.value) || 1))}
                            className="input-field w-full"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            {t.cardDescription}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            {t.cardsPerPage}
                        </label>
                        <select
                            value={cardsPerPage}
                            onChange={(e) => setCardsPerPage(parseInt(e.target.value))}
                            className="input-field w-full appearance-none cursor-pointer"
                        >
                            <option value="2" className="bg-slate-800">2 {t.cards}</option>
                            <option value="3" className="bg-slate-800">3 {t.cards}</option>
                            <option value="4" className="bg-slate-800">4 {t.cards}</option>
                            <option value="5" className="bg-slate-800">5 {t.cards}</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-4 mt-6">
                    <button
                        onClick={generateCards}
                        disabled={isGenerating}
                        className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? t.generating : t.generateCards}
                    </button>

                    {generatedCards.length > 0 && (
                        <button
                            onClick={exportToPDF}
                            disabled={isExporting}
                            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExporting ? t.creatingPdf : t.downloadPdf}
                        </button>
                    )}
                </div>
            </div>

            {/* Vorschau */}
            {generatedCards.length > 0 && (
                <div className="glass-panel p-6 md:p-8">
                    <h2 className="text-center text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-amber-400">{t.preview}</h2>
                    <div className="text-center text-sm text-slate-400 mb-4">
                        {generatedCards.length} {generatedCards.length === 1 ? t.card : t.cards} {t.cardsGenerated}
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
                        <p className="text-center text-slate-500 mt-4">
                            {t.moreCards} {generatedCards.length - 12} {t.cards}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
