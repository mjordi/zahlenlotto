# Agent Guidelines for Zahlenlotto Project

This document contains instructions and guidelines for AI agents (like Claude) working on this project.

## Project Overview

Zahlenlotto is a Next.js-based lottery card generator that creates traditional 90-number Tombola/Bingo cards with multiple language support (German, English, French, Italian).

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PDF Generation**: jsPDF
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
│   ├── components/       # React components
│   │   └── __tests__/    # Component tests
│   ├── contexts/         # React contexts (e.g., LanguageContext)
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
  - `s`: Session seed (8-char alphanumeric)
  - `p`: Number of players (1-20)
  - `c`: Cards per player (1-10)
  - `n`: Player names (comma-separated, optional)
- **Example URL**: `https://example.com/?s=abc12345&p=2&c=3&n=Alice,Bob`
- **Session utilities** in `src/utils/session.ts`:
  - `generateSessionSeed()`: Generate random 8-char seed
  - `generateLottoCardWithSeed(seed, index)`: Deterministic card generation
  - `encodeSessionToParams(session)`: Encode to URLSearchParams
  - `decodeSessionFromParams(params)`: Decode from URLSearchParams
  - `createShareableUrl(session)`: Create full shareable URL

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