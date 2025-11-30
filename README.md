# Zahlenlotto

Eine moderne Web-Applikation für das Zahlenlotto-Spiel, erstellt mit Next.js 14, TypeScript und Tailwind CSS.

## Features

### 🎲 Zahlen Ziehen
- Zufälliges Ziehen von Zahlen (1-75)
- Visuelle Anzeige aller gezogenen und verbleibenden Zahlen
- Verlauf der gezogenen Zahlen
- Zurücksetzen-Funktion für neue Runden

### 🎫 Karten-Generator
- Generierung beliebig vieler Zahlenlotto-Karten
- Einstellbare Anzahl Karten pro A4 Seite (2, 4 oder 6 Karten)
- Live-Vorschau der generierten Karten
- PDF-Export für einfaches Drucken
- Jede Karte enthält 25 zufällige, sortierte Zahlen

## Technologie-Stack

- **Framework:** Next.js 14 (App Router)
- **Sprache:** TypeScript
- **Styling:** Tailwind CSS
- **PDF-Generierung:** jsPDF
- **Hosting:** Vercel

## Performance & Web Vitals

Die Applikation ist optimiert für exzellente Google Web Vitals:

- ✅ Server-Side Rendering (SSR) für schnelle Ladezeiten
- ✅ Optimierte Fonts und Assets
- ✅ Minimales JavaScript-Bundle
- ✅ Responsive Design für alle Geräte
- ✅ Kompression und Caching-Strategien

## Installation

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Production Build erstellen
npm run build

# Production Server starten
npm start
```

Öffnen Sie [http://localhost:3000](http://localhost:3000) in Ihrem Browser.

## Deployment auf Vercel

1. Repository auf GitHub pushen
2. In Vercel importieren
3. Automatisches Deployment läuft

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## Verwendung

### Spiel-Modus
1. Klicken Sie auf "Zahl ziehen", um eine zufällige Zahl zu erhalten
2. Die gezogene Zahl wird auf der Zahlentafel markiert
3. Der Verlauf zeigt alle bisher gezogenen Zahlen
4. "Zurücksetzen" startet ein neues Spiel

### Karten-Generator
1. Wählen Sie die gewünschte Anzahl Karten
2. Wählen Sie, wie viele Karten pro A4 Seite erscheinen sollen
3. Klicken Sie auf "Karten generieren"
4. Laden Sie die generierten Karten als PDF herunter

## Projektstruktur

```
zahlenlotto/
├── app/
│   ├── layout.tsx          # Root Layout mit Metadaten
│   ├── page.tsx            # Hauptseite mit Tab-Navigation
│   └── globals.css         # Globale Styles
├── components/
│   ├── NumberDrawer.tsx    # Zahlenzieh-Komponente
│   ├── CardGenerator.tsx   # Karten-Generator
│   └── LottoCard.tsx       # Einzelne Karte
├── public/                 # Statische Assets
├── next.config.ts          # Next.js Konfiguration
├── vercel.json            # Vercel Deployment-Config
└── package.json
```

## Browser-Kompatibilität

- ✅ Chrome/Edge (neueste Versionen)
- ✅ Firefox (neueste Versionen)
- ✅ Safari (neueste Versionen)
- ✅ Mobile Browser

## Lizenz

MIT

## Entwickelt mit ❤️

Erstellt mit Next.js und optimiert für beste Performance auf Vercel.
