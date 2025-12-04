# Zahlenlotto - Lottery Number Drawing & Card Generator

A modern web application for generating traditional 90-number Tombola/Bingo cards and conducting live number drawings with real-time card tracking.

## Features

### 🎲 Number Drawing
- Interactive number drawing interface (1-90)
- Visual grid showing all numbers with drawn status
- Audio feedback for each drawn number
- Keyboard shortcuts for quick drawing
- Complete drawing history
- Drawing statistics (drawn vs. remaining)

### 🎴 Card Generation & Live Tracking
- Generate 1-99 unique lottery cards
- Traditional format: 3 rows × 9 columns, 5 numbers per row
- **Live card display during number drawing**
- **Real-time number marking on cards**
- **Automatic row completion detection**
- **Celebration animation with confetti and sound when a row completes**
- Export cards to PDF with customizable layout
- Multiple cards per page (2-5 cards)

### 🔗 Shareable Game Sessions
- **Generate shareable URLs** to invite other players
- All players get the **same cards** from a shared link
- Session data encoded in URL (seed, player count, cards per player, names)
- One-click copy to clipboard

### 🌍 Multi-Language Support
- German (Deutsch) 🇩🇪
- English 🇬🇧
- French (Français) 🇫🇷
- Italian (Italiano) 🇮🇹

### 🎨 Modern UI/UX
- **Light/Dark mode with system preference detection**
- **Manual theme toggle for user preference**
- Glass morphism effects
- Responsive layout (mobile, tablet, desktop)
- Smooth animations and transitions
- Accessible keyboard navigation
- Optimized contrast for all elements in both themes

## How to Play

1. **Generate Cards**: Set the number of players and cards per player, then generate your lottery cards
2. **Share the Game**: Click the "Share Game" button to copy a link that gives all players the same cards
3. **Draw Numbers**: Start drawing numbers - they're automatically marked on all cards
4. **Watch for Completion**: When a row is completed, enjoy the confetti celebration and "LOTTO!" announcement!

### Playing with Friends
- Generate cards with player names
- Click "Share Game" to copy the shareable URL
- Send the link to all players
- Everyone opens the link to get the same cards
- One person draws numbers while everyone marks their physical/PDF cards

## Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd zahlenlotto

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev

# Open http://localhost:3000 in your browser
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Building

```bash
# Create production build
npm run build

# Start production server
npm start
```

### Linting

```bash
# Run ESLint
npm run lint
```

## Project Structure

```
zahlenlotto/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx      # Main page with state management
│   │   ├── layout.tsx    # Root layout
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   │   ├── NumberDrawer.tsx  # Drawing & card generation
│   │   ├── LottoCard.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── __tests__/    # Component tests
│   ├── contexts/         # React contexts
│   │   ├── LanguageContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── __tests__/    # Context tests
│   └── utils/            # Utility functions
│       ├── lotto.ts      # Card generation & row completion logic
│       ├── session.ts    # Shareable URL session management
│       ├── translations.ts
│       ├── pdfGenerator.ts
│       └── __tests__/    # Utility tests
├── public/               # Static assets
└── [config files]
```

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **PDF Export**: jsPDF
- **Animations**: canvas-confetti
- **Testing**: Jest + React Testing Library
- **Deployment**: Vercel

## Card Format

Traditional Tombola/Bingo format:
- 3 rows × 9 columns grid
- 5 numbers per row (4 empty cells)
- 15 total numbers per card
- Numbers 1-90 distributed by column:
  - Column 1: 1-9
  - Column 2: 10-19
  - Column 3: 20-29
  - ...
  - Column 9: 80-90
- Numbers sorted within each column
- All numbers unique per card

## Keyboard Shortcuts

- **Space / Enter**: Draw next number
- **R**: Reset game
- **M**: Toggle sound on/off

## Development Guidelines

See [AGENTS.md](./AGENTS.md) for detailed development guidelines and project conventions.

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please ensure:
- All tests pass (`npm test`)
- Linting passes (`npm run lint`)
- Build succeeds (`npm run build`)
- Documentation is updated

## Support

For issues or questions, please open an issue on the GitHub repository.
