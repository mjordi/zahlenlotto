# Zahlenlotto

A modern lottery card generator and number drawing application with support for multiple languages and themes. Built with Next.js 16, TypeScript, and Tailwind CSS.

## Features

- **Number Drawing**: Interactive number drawing system (1-90) with visual feedback and sound effects
- **Card Generation**: Generate traditional Tombola/Bingo cards (3 rows × 9 columns, 5 numbers per row)
- **PDF Export**: Download generated cards as PDF for printing
- **Multiple Languages**: Support for German, English, French, and Italian
- **Light/Dark Mode**: Automatic theme detection based on system preferences with manual toggle
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Keyboard Shortcuts**: Space/Enter to draw numbers, R to reset

## Theme System

The application supports both light and dark themes:

- **Automatic Detection**: Detects your system's color scheme preference on first visit
- **Manual Toggle**: Use the theme toggle button (☀️/🌙 icon) in the top-right corner to switch themes
- **Persistent**: Your theme preference is saved in localStorage for future visits

## Language Support

Available languages:
- 🇩🇪 Deutsch (German) - Default
- 🇬🇧 English
- 🇫🇷 Français (French)
- 🇮🇹 Italiano (Italian)

Language selection is available via the globe icon in the top-right corner. Your preference is automatically saved.

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm, yarn, pnpm, or bun

### Installation

```bash
# Install dependencies
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building

```bash
# Create production build
npm run build

# Start production server
npm start
```

### Code Quality

```bash
# Run linter
npm run lint
```

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **PDF Generation**: jsPDF
- **Testing**: Jest + React Testing Library
- **Deployment**: Vercel

## Project Structure

```
zahlenlotto/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── layout.tsx    # Root layout with providers
│   │   ├── page.tsx      # Main page
│   │   └── globals.css   # Global styles and theme variables
│   ├── components/       # React components
│   │   ├── ThemeToggle.tsx
│   │   ├── LottoCard.tsx
│   │   ├── NumberDrawer.tsx
│   │   ├── CardGenerator.tsx
│   │   └── __tests__/    # Component tests
│   ├── contexts/         # React contexts
│   │   ├── ThemeContext.tsx
│   │   ├── LanguageContext.tsx
│   │   └── __tests__/    # Context tests
│   └── utils/            # Utility functions
│       ├── translations.ts
│       └── lotto.ts
└── public/               # Static assets
```

## Contributing

This project follows test-driven development practices. When contributing:

1. Write tests for new functionality
2. Ensure all tests pass (`npm test`)
3. Run linter (`npm run lint`)
4. Verify build succeeds (`npm run build`)
5. Update documentation as needed

For detailed development guidelines, see `AGENTS.md`.

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Jest Testing](https://jestjs.io/docs/getting-started)

## Deployment

The easiest way to deploy this app is using the [Vercel Platform](https://vercel.com).

The application is configured for deployment in the Frankfurt region (fra1) with optimized security headers. See `vercel.json` for configuration details.
