# Agent Guidelines for Zahlenlotto Project

This document contains instructions and guidelines for AI agents (like Claude) working on this project.

## Project Overview

Zahlenlotto is a Next.js-based lottery card generator that creates traditional 90-number Tombola/Bingo cards with multiple language support (German, English, French, Italian).

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PDF Generation**: jsPDF
- **Real-time Sync**: Vercel KV (with in-memory fallback)
- **Testing**: Jest + React Testing Library
- **Deployment**: Vercel

## Core Principles

### 1. Test-Driven Development
**CRITICAL**: A task is ONLY considered complete when:
- ✅ All existing tests pass (`npm test`)
- ✅ Lint passes (`npm run lint`)
- ✅ New tests are written for new functionality
- ✅ The build succeeds (`npm run build`)
- ✅ Documentation is updated (if necessary) (`README.md` and `AGENTS.md`)

**Never mark a task as done without running and passing all tests.**

### 2. Documentation Standards
When changing functionality, update these files:
- **README.md**: User-facing documentation, setup instructions, features
- **AGENTS.md**: This file - agent guidelines and project conventions
- **Code comments**: Only where logic is non-obvious

### 3. Code Quality

#### Simplicity First
- Avoid over-engineering
- Don't add features not explicitly requested
- Keep abstractions minimal
- Three similar lines are better than premature abstraction

#### Security
- Never introduce vulnerabilities (XSS, SQL injection, command injection, etc.)
- Validate at system boundaries only (user input, external APIs)
- Trust internal code and framework guarantees

#### Testing
- Write comprehensive tests for all new utilities and components
- Follow existing test patterns in `__tests__` directories
- Use descriptive test names that explain behavior
- Mock external dependencies appropriately

### 4. Project Structure

```
zahlenlotto/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   └── api/          # API routes
│   │       └── session/  # Cross-device sync API
│   ├── components/       # React components
│   │   └── __tests__/    # Component tests
│   ├── contexts/         # React contexts (e.g., LanguageContext)
│   ├── hooks/            # Custom React hooks
│   │   └── useGameSync.ts # Cross-device sync hook
│   └── utils/            # Utility functions
│       └── __tests__/    # Utility tests
├── public/               # Static assets
├── .github/
│   ├── workflows/        # CI/CD workflows
│   └── dependabot.yml    # Dependency updates
└── [config files]
```

### 5. Language and Internationalization

The app supports multiple languages via `LanguageContext`. Default language is German.

**When writing tests:**
- Account for the default language (German)
- Use appropriate text matchers (e.g., `/Karte/i` not `/Card/i`)
- Test translations when relevant

### 6. Lotto Card Generation Rules

Cards follow traditional Tombola/Bingo format:
- 3 rows × 9 columns grid
- 5 numbers per row (4 empty cells)
- 15 total numbers per card
- Numbers 1-90 distributed by column:
  - Column 0: 1-9
  - Column 1: 10-19
  - Column 2: 20-29
  - ...
  - Column 8: 80-90
- Numbers sorted within each column
- All numbers unique per card

**Seeded Card Generation:**
- Cards can be generated with a seed for reproducibility
- Use `generateLottoCardWithSeed(seed, cardIndex)` from `session.ts`
- Same seed + cardIndex = same card (deterministic)
- This enables shareable game sessions via URL

### 6.1 Shareable Game Sessions

The app supports shareable URLs for game sessions:
- **Session data** is encoded in URL parameters:
  - `s`: Session seed (8-char alphanumeric) - required
  - `d`: Drawn numbers (comma-separated, optional)
  - `p`: Number of players (1-20, optional)
  - `c`: Cards per player (1-10, optional)
  - `n`: Player names (comma-separated, optional)
- **Draw-only sessions**: Can share just the draw without cards (only `s` and `d` params)
- **Example URLs**:
  - With cards: `https://example.com/?s=abc12345&d=1,42,88&p=2&c=3&n=Alice,Bob`
  - Draw-only: `https://example.com/?s=abc12345&d=1,42,88`
- **Player names are positional**: empty names are kept in place (`Alice,,Charlie`)
  so later names do not shift onto the wrong player, and each name is
  percent-encoded so a name containing a comma survives. Only *trailing* empty
  names are dropped; decoding pads them back.
- **After loading**, the app keeps only `?s=<seed>` in the URL, for host and
  guest alike (`setSeedInUrl()`). Without it a reload cannot tell which session
  the tab belonged to: a guest would become a local host, and a host would start
  a fresh game and strand its guests on an abandoned session. The volatile state
  comes from the sync API anyway.
- **Host vs guest on load** is decided by whether `getHostToken(seed)` returns a
  token for that seed, not by the mere presence of `?s=` - otherwise a host
  returning to its own session would be demoted to a spectator.
- **Cross-device sync**: Polling with Vercel KV for state sync across different devices
- **Same-browser sync**: Uses BroadcastChannel API for syncing across browser tabs
- **Session utilities** in `src/utils/session.ts`:
  - `generateSessionSeed()`: Generate random 8-char seed
  - `generateLottoCardWithSeed(seed, index)`: Deterministic card generation
  - `encodeSessionToParams(session)`: Encode to URLSearchParams
  - `decodeSessionFromParams(params)`: Decode from URLSearchParams
  - `createShareableUrl(session)`: Create full shareable URL
  - `SessionSync` class: BroadcastChannel wrapper for real-time sync

### 6.2 Cross-Device Sync Architecture

The cross-device sync uses a polling-based approach with Vercel KV:

**API Route** (`src/app/api/session/[seed]/route.ts`):
- `GET /api/session/[seed]`: Poll for current game state. Public (anyone with the
  share link), and never returns the host token.
- `POST /api/session/[seed]`: Update game state. Requires the `x-host-token`
  header. Card configuration is **merged**, so a plain draw update keeps the
  stored cards.

**Write atomicity** (`commitState()`):
- The sequence check and the write happen together. The in-memory store does
  read-check-write in one synchronous block, which Node's single thread makes
  indivisible.
- On Vercel KV they are still two round trips, so a narrow window remains.
  Reaching it needs two concurrent host writers, which the design rules out:
  the host token lives in `sessionStorage` (per tab), so a session has exactly
  one host tab, and that tab chains its writes.
- **Known gap**: closing it completely needs a Lua compare-and-set via
  `kv.eval()`, which cannot be verified without a live KV instance. Do not ship
  one untested - a wrong script breaks the only production write path, which is
  far worse than the race it closes.

**Host authorization**:
- The host generates a secret token (`generateHostToken()`) alongside the seed
  and keeps it in `sessionStorage` - it is **never** part of a shareable URL.
- The first `POST` for a seed claims the session with that token; later writes
  must present the same token or get a `403`.
- Client-side guest restrictions are UX only - the token is the actual boundary.

**useGameSync Hook** (`src/hooks/useGameSync.ts`):
- Hosts push state updates to the server after each draw
- Guests poll the server every 2 seconds for state changes
- Hosts do **not** poll, but do read the stored state **once on mount**, so a
  refreshed host resumes the session instead of overwriting it with an empty
  board. Drawing is blocked (`isHydrating`) until that read finishes: a draw
  computed from the pre-hydration board would overwrite the very history the
  refresh is resuming. The read is also discarded once a write has been
  *queued* - not merely completed - for the same reason. It is bounded by
  `hydrateTimeout` (5s) and always releases the host: an unreachable API has to
  degrade to local play, never lock the host out of their own game.
- The mount read honours a recorded reset: an empty state with `lastUpdate > 0`
  invokes `onReset`, so a host reopening an older full share URL does not
  resurrect the numbers that link still carries.
- Any push response other than `2xx` or `409` sets `syncUnavailable`. `409` is
  the expected "a newer write already won" answer and means sync is healthy;
  everything else means guests have stopped receiving this host's draws, and
  the host is told rather than left playing on unaware.
- Host writes are **chained and sequenced**: each carries a strictly increasing
  `clientSeq` (clock-seeded so it keeps rising across a reload) and waits for
  the previous write. Two overlapping pushes - a slow draw and then a reset -
  would otherwise land out of order and the stale draw would resurrect numbers
  the host had cleared. The server rejects an overtaken write with `409`.
- Integrates BroadcastChannel for same-browser tab sync
- Session identity (seed + token) lives in refs and is registered through
  `claimSession()`, so a session created inside an event handler can be pushed
  to immediately, before React re-renders
- A **reset is stored as an empty, freshly timestamped state**, not a delete: a
  deleted key reads back as `lastUpdate: 0`, which guests can never distinguish
  from "no state yet", so the reset would never propagate
- `lastUpdate: 0` means the server holds no state - guests keep whatever they
  restored from the share URL instead of clearing it

**State Structure**:
```typescript
interface GameState {
    drawnNumbers: number[];
    currentNumber: number | null;
    lastUpdate: number; // Timestamp for change detection
    numberOfPlayers?: number;
    cardsPerPlayer?: number;
    playerNames?: string[];
    clientSeq?: number;  // Rejects host writes that a newer one overtook
    hostToken?: string;  // Server-only, stripped from every response
}
```

**Environment Variables** (for Vercel KV in production):
- `KV_REST_API_URL`: Vercel KV REST API URL
- `KV_REST_API_TOKEN`: Vercel KV authentication token

The in-memory fallback is **development only**. It is per-process, so it cannot
work across serverless instances; in production a missing KV configuration
returns `503` and the UI shows a sync warning rather than silently desyncing.

### 7. Git Workflow

**Commits:**
- Only create commits when explicitly requested
- Follow conventional commit format: `type: description`
- Include co-author footer for AI assistance:
  ```
  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

**Pull Requests:**
- Create meaningful PR titles and descriptions
- Include test plan in PR body
- Reference related issues

### 8. CI/CD and Automation

**Dependabot:**
- Configured for weekly npm dependency updates
- Auto-merge enabled for minor and patch versions
- Requires all tests to pass before auto-merge

**GitHub Actions:**
- `ci.yml`: Runs on all PRs and pushes (lint, test, build)
- `dependabot-auto-merge.yml`: Handles automatic dependency updates

### 9. Development Workflow

```bash
# Development
npm run dev          # Start dev server at localhost:3000

# Testing
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Quality checks
npm run lint         # Run ESLint
npm run build        # Production build

# Deployment
git push             # Auto-deploys to Vercel (if configured)
```

### 10. Common Tasks Checklist

When implementing a new feature:
- [ ] Write failing tests first (TDD)
- [ ] Implement the feature
- [ ] Ensure all tests pass
- [ ] Run build to verify no errors
- [ ] Update documentation if needed
- [ ] Check for security issues
- [ ] Commit with proper message format

When fixing a bug:
- [ ] Write a test that reproduces the bug
- [ ] Fix the bug
- [ ] Verify the test now passes
- [ ] Run full test suite
- [ ] Check for regressions
- [ ] Update docs if bug was due to misunderstanding

### 11. Performance Considerations

- Images optimized via Next.js Image component
- Bundle size monitored via build output
- CSS optimized with Tailwind's JIT compiler
- Remove console logs in production (configured in `next.config.ts`)

### 12. Vercel Deployment

Configuration in `vercel.json`:
- Region: Frankfurt (fra1) for EU users
- Security headers configured
- Automatic deployments from main branch

## Important Notes

- **Never skip tests**: Testing is mandatory, not optional
- **Backwards compatibility**: Delete unused code completely, no compatibility hacks
- **Error handling**: Only validate at boundaries, trust internal code
- **Comments**: Only add where logic is non-obvious
- **Types**: Leverage TypeScript, avoid `any` unless absolutely necessary

## Questions?

If unclear about:
- Architecture decisions → Check existing code patterns
- Test requirements → Look at existing tests in `__tests__` directories
- Deployment → Refer to `vercel.json` and GitHub workflows
- Styling → Follow Tailwind conventions in existing components