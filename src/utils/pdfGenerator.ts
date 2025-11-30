import { jsPDF } from 'jspdf';
import { Translations } from './translations';
import { COLUMN_LABELS } from './lotto';

interface Card {
    id: number;
    grid: (number | null)[][];
}

interface PdfConfig {
    cardsPerPage: number;
}

export function generatePdf(cards: Card[], t: Translations, config: PdfConfig): void {
    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 15;
        const headerSpace = 45;
        const footerSpace = 20;

        const availableHeight = pageHeight - headerSpace - footerSpace - 2 * margin;
        const pages = Math.ceil(cards.length / config.cardsPerPage);

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
            const startIdx = pageNum * config.cardsPerPage;
            const endIdx = Math.min(startIdx + config.cardsPerPage, cards.length);
            const pageCards = cards.slice(startIdx, endIdx);

            const cardOverhead = 18;
            const totalCardHeight = availableHeight / config.cardsPerPage;
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

        const totalCardsText = cards.length;
        pdf.save(`${t.pdfTitle.toLowerCase()}_${totalCardsText}_${t.cards.toLowerCase()}.pdf`);
    } catch (error) {
        console.error('Fehler beim PDF-Export:', error);
        alert('Fehler beim Erstellen der PDF-Datei');
    }
}
