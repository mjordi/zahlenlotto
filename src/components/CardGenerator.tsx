import { useState, useCallback, useRef } from 'react';
import LottoCard from './LottoCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateLottoCard, LottoCard as LottoCardType } from '@/utils/lotto';
import { generatePdf } from '@/utils/pdfGenerator';

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

        // Allow UI to update before blocking with PDF generation
        setTimeout(() => {
            generatePdf(generatedCards, t, { cardsPerPage });
            setIsExporting(false);
        }, 10);
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
                            max="99"
                            value={totalCards}
                            onChange={(e) => setTotalCards(Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
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
