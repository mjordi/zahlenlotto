export type Language = 'de' | 'en' | 'fr' | 'it';

export const SUPPORTED_LANGUAGES: { code: Language; labelKey: keyof Translations; flag: string }[] = [
    { code: 'de', labelKey: 'languageGerman', flag: '🇩🇪' },
    { code: 'en', labelKey: 'languageEnglish', flag: '🇬🇧' },
    { code: 'fr', labelKey: 'languageFrench', flag: '🇫🇷' },
    { code: 'it', labelKey: 'languageItalian', flag: '🇮🇹' },
];

export interface Translations {
    // Header
    appTitle: string;
    appSubtitle: string;

    // Tabs
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
    cardsPerPage: string;
    generateCards: string;
    generating: string;
    downloadPdf: string;
    creatingPdf: string;
    card: string;
    cards: string;

    // PDF
    pdfTitle: string;
    pdfSubtitle: string;
    pdfPageOf: string;
    pdfInstructions: string;
    pdfFilename: string;
    pdfError: string;

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

    // Playing Cards
    playingCards: string;
    lottoWin: string;
    rowComplete: string;

    // Player Settings
    numberOfPlayers: string;
    cardsPerPlayer: string;
    playerLabel: string;

    // Theme
    themeAuto: string;
    themeLight: string;
    themeDark: string;

    // Share
    shareGame: string;
    shareGameDescription: string;
    copyLink: string;
    linkCopied: string;
    joinedSession: string;
    spectatorMode: string;
    hostOnly: string;
    waitingForCards: string;
    syncUnavailable: string;
}

export const translations: Record<Language, Translations> = {
    de: {
        // Header
        appTitle: 'Zahlenlotto',
        appSubtitle: 'Zahlenziehung & Kartengenerierung',

        // Tabs
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
        cardsPerPage: 'Karten pro A4 Seite',
        generateCards: 'Karten generieren',
        generating: 'Generiere...',
        downloadPdf: 'Als PDF herunterladen',
        creatingPdf: 'Erstelle PDF...',
        card: 'Karte',
        cards: 'Karten',

        // PDF
        pdfTitle: 'Zahlenlotto',
        pdfSubtitle: 'Zahlen 1-90 • 5 Zahlen pro Reihe',
        pdfPageOf: 'von',
        pdfInstructions: "Spielanleitung: Decke die gezogenen Zahlen ab. Wer zuerst eine Reihe voll hat, ruft 'LOTTO!'",
        pdfFilename: 'zahlenlotto_karten',
        pdfError: 'Fehler beim Erstellen der PDF-Datei',

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

        // Playing Cards
        playingCards: 'Spielkarten',
        lottoWin: 'LOTTO!',
        rowComplete: 'Reihe komplett!',

        // Player Settings
        numberOfPlayers: 'Anzahl Spieler',
        cardsPerPlayer: 'Karten pro Spieler',
        playerLabel: 'Spieler',

        // Theme
        themeAuto: 'Automatisch',
        themeLight: 'Hell',
        themeDark: 'Dunkel',

        // Share
        shareGame: 'Spiel teilen',
        shareGameDescription: 'Teile diesen Link, damit andere Spieler dieselben Karten erhalten',
        copyLink: 'Link kopieren',
        linkCopied: 'Link kopiert!',
        joinedSession: 'Geteiltem Spiel beigetreten',
        spectatorMode: 'Zuschauermodus',
        hostOnly: 'Nur der Gastgeber kann Zahlen ziehen',
        waitingForCards: 'Warten auf Karten vom Gastgeber...',
        syncUnavailable: 'Synchronisierung nicht verfügbar - andere Geräte sehen diese Ziehung nicht.',
    },

    en: {
        // Header
        appTitle: 'Number Lotto',
        appSubtitle: 'Number Drawing & Card Generation',

        // Tabs
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
        cardsPerPage: 'Cards per A4 Page',
        generateCards: 'Generate Cards',
        generating: 'Generating...',
        downloadPdf: 'Download as PDF',
        creatingPdf: 'Creating PDF...',
        card: 'Card',
        cards: 'Cards',

        // PDF
        pdfTitle: 'Number Lotto',
        pdfSubtitle: 'Numbers 1-90 • 5 numbers per row',
        pdfPageOf: 'of',
        pdfInstructions: "Game rules: Cover the drawn numbers. First to complete a row shouts 'LOTTO!'",
        pdfFilename: 'number_lotto_cards',
        pdfError: 'Error creating PDF file',

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

        // Playing Cards
        playingCards: 'Playing Cards',
        lottoWin: 'LOTTO!',
        rowComplete: 'Row Complete!',

        // Player Settings
        numberOfPlayers: 'Number of Players',
        cardsPerPlayer: 'Cards per Player',
        playerLabel: 'Player',

        // Theme
        themeAuto: 'Automatic',
        themeLight: 'Light',
        themeDark: 'Dark',

        // Share
        shareGame: 'Share Game',
        shareGameDescription: 'Share this link so other players get the same cards',
        copyLink: 'Copy Link',
        linkCopied: 'Link copied!',
        joinedSession: 'Joined shared game',
        spectatorMode: 'Spectator Mode',
        hostOnly: 'Only the host can draw numbers',
        waitingForCards: 'Waiting for cards from host...',
        syncUnavailable: 'Sync unavailable - other devices will not see this draw.',
    },

    fr: {
        // Header
        appTitle: 'Loto Numérique',
        appSubtitle: 'Tirage de Numéros & Génération de Cartes',

        // Tabs
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
        cardsPerPage: 'Cartes par Page A4',
        generateCards: 'Générer des Cartes',
        generating: 'Génération...',
        downloadPdf: 'Télécharger en PDF',
        creatingPdf: 'Création du PDF...',
        card: 'Carte',
        cards: 'Cartes',

        // PDF
        pdfTitle: 'Loto Numérique',
        pdfSubtitle: 'Numéros 1-90 • 5 numéros par ligne',
        pdfPageOf: 'de',
        pdfInstructions: "Règles du jeu: Couvrez les numéros tirés. Le premier à compléter une ligne crie 'LOTO!'",
        pdfFilename: 'loto_numerique_cartes',
        pdfError: 'Erreur lors de la création du fichier PDF',

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

        // Playing Cards
        playingCards: 'Cartes de Jeu',
        lottoWin: 'LOTO!',
        rowComplete: 'Ligne Complète!',

        // Player Settings
        numberOfPlayers: 'Nombre de Joueurs',
        cardsPerPlayer: 'Cartes par Joueur',
        playerLabel: 'Joueur',

        // Theme
        themeAuto: 'Automatique',
        themeLight: 'Clair',
        themeDark: 'Sombre',

        // Share
        shareGame: 'Partager le Jeu',
        shareGameDescription: 'Partagez ce lien pour que les autres joueurs obtiennent les mêmes cartes',
        copyLink: 'Copier le Lien',
        linkCopied: 'Lien copié!',
        joinedSession: 'Partie partagée rejointe',
        spectatorMode: 'Mode Spectateur',
        hostOnly: "Seul l'hôte peut tirer les numéros",
        waitingForCards: "En attente des cartes de l'hôte...",
        syncUnavailable: "Synchronisation indisponible - les autres appareils ne verront pas ce tirage.",
    },

    it: {
        // Header
        appTitle: 'Lotto Numerico',
        appSubtitle: 'Estrazione Numeri & Generazione Cartelle',

        // Tabs
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
        cardsPerPage: 'Cartelle per Pagina A4',
        generateCards: 'Genera Cartelle',
        generating: 'Generazione...',
        downloadPdf: 'Scarica come PDF',
        creatingPdf: 'Creazione PDF...',
        card: 'Cartella',
        cards: 'Cartelle',

        // PDF
        pdfTitle: 'Lotto Numerico',
        pdfSubtitle: 'Numeri 1-90 • 5 numeri per riga',
        pdfPageOf: 'di',
        pdfInstructions: "Regole del gioco: Copri i numeri estratti. Il primo a completare una riga grida 'TOMBOLA!'",
        pdfFilename: 'lotto_numerico_cartelle',
        pdfError: 'Errore durante la creazione del file PDF',

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

        // Playing Cards
        playingCards: 'Cartelle da Gioco',
        lottoWin: 'TOMBOLA!',
        rowComplete: 'Riga Completa!',

        // Player Settings
        numberOfPlayers: 'Numero di Giocatori',
        cardsPerPlayer: 'Cartelle per Giocatore',
        playerLabel: 'Giocatore',

        // Theme
        themeAuto: 'Automatico',
        themeLight: 'Chiaro',
        themeDark: 'Scuro',

        // Share
        shareGame: 'Condividi Partita',
        shareGameDescription: 'Condividi questo link per dare agli altri giocatori le stesse cartelle',
        copyLink: 'Copia Link',
        linkCopied: 'Link copiato!',
        joinedSession: 'Partita condivisa unita',
        spectatorMode: 'Modalità Spettatore',
        hostOnly: "Solo l'host può estrarre numeri",
        waitingForCards: "In attesa delle cartelle dall'host...",
        syncUnavailable: "Sincronizzazione non disponibile - gli altri dispositivi non vedranno questa estrazione.",
    },
};

export function getTranslations(language: Language): Translations {
    return translations[language];
}
