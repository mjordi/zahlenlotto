export type Language = 'de' | 'en' | 'fr' | 'it';

export interface Translations {
    // Header
    appTitle: string;
    appSubtitle: string;

    // Tabs
    tabDrawNumbers: string;
    tabGenerateCards: string;

    // Number Drawer
    currentDrawing: string;
    drawNumber: string;
    restart: string;
    allNumbersOverview: string;
    drawn: string;
    remaining: string;
    drawnNumbersList: string;
    noNumbersDrawn: string;
    noNumberDrawn: string;
    allDrawn: string;
    nthDrawing: string;

    // Card Generator
    settings: string;
    totalCards: string;
    cardsPerPage: string;
    cardDescription: string;
    generateCards: string;
    generating: string;
    downloadPdf: string;
    creatingPdf: string;
    preview: string;
    cardsGenerated: string;
    moreCards: string;
    card: string;
    cards: string;

    // PDF
    pdfTitle: string;
    pdfSubtitle: string;
    pdfPageOf: string;
    pdfInstructions: string;

    // Keyboard shortcuts
    keyboardHint: string;
    keySpace: string;
    keyEnter: string;
    keyR: string;
    keyDraw: string;
    keyReset: string;

    // Confirmations
    confirmRestart: string;

    // Sound
    soundOn: string;
    soundOff: string;
    muteToggle: string;

    // Languages
    languageGerman: string;
    languageEnglish: string;
    languageFrench: string;
    languageItalian: string;
    selectLanguage: string;
}

export const translations: Record<Language, Translations> = {
    de: {
        // Header
        appTitle: 'Zahlenlotto',
        appSubtitle: 'Zahlenziehung & Kartengenerierung',

        // Tabs
        tabDrawNumbers: 'Zahlen ziehen',
        tabGenerateCards: 'Karten generieren',

        // Number Drawer
        currentDrawing: 'Aktuelle Ziehung',
        drawNumber: 'Zahl ziehen',
        restart: 'Neu starten',
        allNumbersOverview: 'Übersicht aller Zahlen',
        drawn: 'Gezogen',
        remaining: 'Verbleibend',
        drawnNumbersList: 'Gezogene Zahlen (Reihenfolge)',
        noNumbersDrawn: 'Noch keine Zahlen gezogen',
        noNumberDrawn: 'Noch keine Zahl gezogen',
        allDrawn: 'Alle 90 Zahlen wurden gezogen!',
        nthDrawing: '. Ziehung',

        // Card Generator
        settings: 'Einstellungen',
        totalCards: 'Anzahl Karten gesamt',
        cardsPerPage: 'Karten pro A4 Seite',
        cardDescription: 'Jede Karte: 3 Reihen × 9 Spalten, 5 Zahlen pro Reihe',
        generateCards: 'Karten generieren',
        generating: 'Generiere...',
        downloadPdf: 'Als PDF herunterladen',
        creatingPdf: 'Erstelle PDF...',
        preview: 'Vorschau',
        cardsGenerated: 'generiert',
        moreCards: '... und',
        card: 'Karte',
        cards: 'Karten',

        // PDF
        pdfTitle: 'Zahlenlotto',
        pdfSubtitle: 'Zahlen 1-90 • 5 Zahlen pro Reihe',
        pdfPageOf: 'von',
        pdfInstructions: "Spielanleitung: Decke die gezogenen Zahlen ab. Wer zuerst eine Reihe voll hat, ruft 'LOTTO!'",

        // Keyboard shortcuts
        keyboardHint: 'Tastatur:',
        keySpace: 'Space',
        keyEnter: 'Enter',
        keyR: 'R',
        keyDraw: 'Ziehen',
        keyReset: 'Reset',

        // Confirmations
        confirmRestart: 'Spiel wirklich neu starten?',

        // Sound
        soundOn: 'Ton ein',
        soundOff: 'Ton aus',
        muteToggle: 'Stummschalten',

        // Languages
        languageGerman: 'Deutsch',
        languageEnglish: 'English',
        languageFrench: 'Français',
        languageItalian: 'Italiano',
        selectLanguage: 'Sprache wählen',
    },

    en: {
        // Header
        appTitle: 'Number Lotto',
        appSubtitle: 'Number Drawing & Card Generation',

        // Tabs
        tabDrawNumbers: 'Draw Numbers',
        tabGenerateCards: 'Generate Cards',

        // Number Drawer
        currentDrawing: 'Current Drawing',
        drawNumber: 'Draw Number',
        restart: 'Restart',
        allNumbersOverview: 'All Numbers Overview',
        drawn: 'Drawn',
        remaining: 'Remaining',
        drawnNumbersList: 'Drawn Numbers (Order)',
        noNumbersDrawn: 'No numbers drawn yet',
        noNumberDrawn: 'No number drawn yet',
        allDrawn: 'All 90 numbers have been drawn!',
        nthDrawing: '. Drawing',

        // Card Generator
        settings: 'Settings',
        totalCards: 'Total Cards',
        cardsPerPage: 'Cards per A4 Page',
        cardDescription: 'Each card: 3 rows × 9 columns, 5 numbers per row',
        generateCards: 'Generate Cards',
        generating: 'Generating...',
        downloadPdf: 'Download as PDF',
        creatingPdf: 'Creating PDF...',
        preview: 'Preview',
        cardsGenerated: 'generated',
        moreCards: '... and',
        card: 'Card',
        cards: 'Cards',

        // PDF
        pdfTitle: 'Number Lotto',
        pdfSubtitle: 'Numbers 1-90 • 5 numbers per row',
        pdfPageOf: 'of',
        pdfInstructions: "Game rules: Cover the drawn numbers. First to complete a row shouts 'LOTTO!'",

        // Keyboard shortcuts
        keyboardHint: 'Keyboard:',
        keySpace: 'Space',
        keyEnter: 'Enter',
        keyR: 'R',
        keyDraw: 'Draw',
        keyReset: 'Reset',

        // Confirmations
        confirmRestart: 'Really restart the game?',

        // Sound
        soundOn: 'Sound on',
        soundOff: 'Sound off',
        muteToggle: 'Mute/Unmute',

        // Languages
        languageGerman: 'Deutsch',
        languageEnglish: 'English',
        languageFrench: 'Français',
        languageItalian: 'Italiano',
        selectLanguage: 'Select language',
    },

    fr: {
        // Header
        appTitle: 'Loto Numérique',
        appSubtitle: 'Tirage de Numéros & Génération de Cartes',

        // Tabs
        tabDrawNumbers: 'Tirer des Numéros',
        tabGenerateCards: 'Générer des Cartes',

        // Number Drawer
        currentDrawing: 'Tirage Actuel',
        drawNumber: 'Tirer un Numéro',
        restart: 'Recommencer',
        allNumbersOverview: 'Aperçu de Tous les Numéros',
        drawn: 'Tirés',
        remaining: 'Restants',
        drawnNumbersList: 'Numéros Tirés (Ordre)',
        noNumbersDrawn: 'Aucun numéro tiré',
        noNumberDrawn: 'Aucun numéro tiré',
        allDrawn: 'Tous les 90 numéros ont été tirés!',
        nthDrawing: 'e Tirage',

        // Card Generator
        settings: 'Paramètres',
        totalCards: 'Nombre Total de Cartes',
        cardsPerPage: 'Cartes par Page A4',
        cardDescription: 'Chaque carte: 3 lignes × 9 colonnes, 5 numéros par ligne',
        generateCards: 'Générer des Cartes',
        generating: 'Génération...',
        downloadPdf: 'Télécharger en PDF',
        creatingPdf: 'Création du PDF...',
        preview: 'Aperçu',
        cardsGenerated: 'générées',
        moreCards: '... et',
        card: 'Carte',
        cards: 'Cartes',

        // PDF
        pdfTitle: 'Loto Numérique',
        pdfSubtitle: 'Numéros 1-90 • 5 numéros par ligne',
        pdfPageOf: 'de',
        pdfInstructions: "Règles du jeu: Couvrez les numéros tirés. Le premier à compléter une ligne crie 'LOTO!'",

        // Keyboard shortcuts
        keyboardHint: 'Clavier:',
        keySpace: 'Espace',
        keyEnter: 'Entrée',
        keyR: 'R',
        keyDraw: 'Tirer',
        keyReset: 'Réinitialiser',

        // Confirmations
        confirmRestart: 'Vraiment recommencer le jeu?',

        // Sound
        soundOn: 'Son activé',
        soundOff: 'Son désactivé',
        muteToggle: 'Muet/Actif',

        // Languages
        languageGerman: 'Deutsch',
        languageEnglish: 'English',
        languageFrench: 'Français',
        languageItalian: 'Italiano',
        selectLanguage: 'Choisir la langue',
    },

    it: {
        // Header
        appTitle: 'Lotto Numerico',
        appSubtitle: 'Estrazione Numeri & Generazione Cartelle',

        // Tabs
        tabDrawNumbers: 'Estrai Numeri',
        tabGenerateCards: 'Genera Cartelle',

        // Number Drawer
        currentDrawing: 'Estrazione Attuale',
        drawNumber: 'Estrai Numero',
        restart: 'Ricomincia',
        allNumbersOverview: 'Panoramica di Tutti i Numeri',
        drawn: 'Estratti',
        remaining: 'Rimanenti',
        drawnNumbersList: 'Numeri Estratti (Ordine)',
        noNumbersDrawn: 'Nessun numero estratto',
        noNumberDrawn: 'Nessun numero estratto',
        allDrawn: 'Tutti i 90 numeri sono stati estratti!',
        nthDrawing: '° Estrazione',

        // Card Generator
        settings: 'Impostazioni',
        totalCards: 'Numero Totale di Cartelle',
        cardsPerPage: 'Cartelle per Pagina A4',
        cardDescription: 'Ogni cartella: 3 righe × 9 colonne, 5 numeri per riga',
        generateCards: 'Genera Cartelle',
        generating: 'Generazione...',
        downloadPdf: 'Scarica come PDF',
        creatingPdf: 'Creazione PDF...',
        preview: 'Anteprima',
        cardsGenerated: 'generate',
        moreCards: '... e',
        card: 'Cartella',
        cards: 'Cartelle',

        // PDF
        pdfTitle: 'Lotto Numerico',
        pdfSubtitle: 'Numeri 1-90 • 5 numeri per riga',
        pdfPageOf: 'di',
        pdfInstructions: "Regole del gioco: Copri i numeri estratti. Il primo a completare una riga grida 'TOMBOLA!'",

        // Keyboard shortcuts
        keyboardHint: 'Tastiera:',
        keySpace: 'Spazio',
        keyEnter: 'Invio',
        keyR: 'R',
        keyDraw: 'Estrai',
        keyReset: 'Ricomincia',

        // Confirmations
        confirmRestart: 'Davvero ricominciare il gioco?',

        // Sound
        soundOn: 'Suono attivo',
        soundOff: 'Suono disattivo',
        muteToggle: 'Muto/Attivo',

        // Languages
        languageGerman: 'Deutsch',
        languageEnglish: 'English',
        languageFrench: 'Français',
        languageItalian: 'Italiano',
        selectLanguage: 'Seleziona lingua',
    },
};

export function getTranslations(language: Language): Translations {
    return translations[language];
}
