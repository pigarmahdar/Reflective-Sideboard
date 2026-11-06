# AGENTS.md

Instructions and architectural boundaries for autonomous AI agents working on Reflective Sideboard.

## Project Overview

Reflective Sideboard is a private, local-first journal and theorycrafting web application for Magic: The Gathering (MTG) players, featuring card syntax autocomplete and deck reflection prompts. It runs entirely client-side with no user accounts, backend servers, analytics, or tracking. The core stack is React 19, TypeScript, Vite 6, and Tailwind CSS 4, deploying as static assets to GitHub Pages.

## Verification Commands

Before opening a pull request, an agent **MUST** run the following commands and ensure all pass with zero errors and warnings:

```bash
# 1. Install dependencies
npm ci

# 2. Typecheck / Lint (verifies TypeScript types across the project)
npm run lint

# 3. Unit Test Suite (Node.js native test runner via --experimental-strip-types)
npm test

# 4. Production Build (validates Vite bundling and chunk outputs)
npm run build
```

*Note: `npm run lint` executes `tsc --noEmit`. Tests use Node 22's built-in `node:test` runner against `src/**/*.test.ts` without third-party test runners.*

## Architecture & Code Layout

```
src/
├── App.tsx                     # Root state orchestrator: persistence, shortcuts, filtering
├── main.tsx                    # Application mount wrapped in ErrorBoundary
├── index.css                   # Tailwind 4, typography, and semantic @theme tokens
├── types.ts                    # Shared domain types (JournalEntry, MTGCard, etc.)
├── components/                 # UI components
│   ├── JournalEditor.tsx       # Markdown writing/preview canvas and prompt stimulus
│   ├── Sidebar.tsx             # Collapsible nav, Fuse.js fuzzy search, backup & trash
│   ├── CardSidebar.tsx         # Tactile card inspector with 3D tilt and dwell foil animation
│   ├── AutocompletePopover.tsx # Floating cursor-anchored Scryfall suggestions
│   ├── Dialog.tsx              # Accessible themed modal replacing native alert/confirm
│   ├── UndoToast.tsx           # Toast notification for soft-deleted entries
│   ├── BackupNudge.tsx         # Re-arming reminder to export browser-local data
│   ├── ErrorBoundary.tsx       # Fallback screen with emergency local JSON export
│   └── ThemeToggle.tsx         # Light/dark mode toggle component
├── storage/                    # Persistence boundary
│   ├── journalStorage.ts       # LocalStorage repository, migration, and debounced saver
│   └── backup.ts               # Versioned JSON backup (v3) export and validation
├── services/                   # External API clients
│   └── scryfall.ts             # Abort-safe Scryfall client (autocomplete and named cards)
├── hooks/                      # Custom React hooks
│   ├── useTheme.ts             # Theme state and ?theme= query override resolver
│   └── useMediaQuery.ts        # Responsive layout listener via matchMedia
└── lib/                        # Helpers and pure domain logic
    ├── backupNudge.ts          # Pure functional logic for backup reminder thresholds
    ├── editorErgonomics.ts     # Tab indentation and list continuation calculations
    ├── caretPosition.ts        # Coordinates calculator for cursor-relative popovers
    └── utils.ts                # Tailwind merge helper (cn) and date formatters
```

- `index.html`: Contains a blocking pre-paint script mirroring `src/hooks/useTheme.ts` to prevent theme flashing on reload.
- `vite.config.ts`: Configures base URL (`PAGES_BASE` for GitHub Pages) and Rollup vendor code-splitting chunks.

## Development Guidelines

- **Minimal Diffs**: Solve the issue with the least code necessary. Avoid adding speculative abstractions, wrappers, or refactoring unrelated files.
- **Strict Typing**: All domain entities and helper inputs/outputs must be strictly typed. Interfaces reside in `src/types.ts`. Avoid `any`. The project uses `allowImportingTsExtensions: true` (e.g. `import type { MTGCard } from '../types.ts';`).
- **Defensive Storage & Error Handling**:
  - Storage access and JSON parsing must always be wrapped in `try/catch` to gracefully tolerate private browsing modes and quota ceilings.
  - Never allow malformed data to crash the app or overwrite valid state.
  - Network requests to Scryfall must catch errors, handle `AbortError` silently, and return `[]` or `null` instead of throwing to the UI.
  - Use the custom `Dialog` component or `UndoToast` instead of native `window.alert()` or `window.confirm()`.
- **Token-Driven Theming**:
  - Always use semantic CSS tokens (`bg-paper`, `text-ink`, `bg-surface`, `bg-surface-raised`, `border-line`, `text-muted`, `text-body`, `bg-accent`, `bg-accent-soft`).
  - Never use raw Tailwind palette classes (e.g., `bg-slate-900`, `text-indigo-600`) where a semantic token exists.
  - Any change to initial theme resolution in `src/hooks/useTheme.ts` must be mirrored identically in `index.html`.
- **Unit Testing**:
  - Any new or modified business logic (storage mutations, backup serializers, editor ergonomics, nudge thresholds) must include tests in `src/**/*.test.ts`.
  - Tests use Node's native `node:test` and `node:assert/strict`.

## Hard Invariants & Anti-Patterns

1. **NO Backend or External Servers**: This is a static client-side SPA. Never introduce backend services, server-side APIs, database connections, or auth endpoints.
2. **NO Telemetry, Analytics, or Tracking**: Never add analytics scripts, trackers, or telemetry (Google Analytics, Sentry, Mixpanel, etc.).
3. **NO Third-Party Test Frameworks or State Stores**: Do not install or introduce Vitest, Jest, Redux, Zustand, MobX, etc. Stick to native React state and `node:test`.
4. **NO AI Scaffolding or Heavy LLM SDKs**: Do not import or re-introduce `@google/genai` or similar libraries. The reflective prompts are a static array randomized client-side.
5. **NEVER Overwrite or Delete Legacy Storage**: The legacy recovery key `spellbook_journal_entries` must NEVER be deleted or overwritten during migration or save operations.
6. **NEVER Silently Overwrite Data on Backup Restore**: Backups must be validated with `parseBackup` and confirmed by the user. A payload with zero valid entries must be rejected immediately.
7. **NEVER Call External APIs Other Than Scryfall**: The app only communicates with `https://api.scryfall.com`. Never introduce external network calls to other domains.
8. **NEVER Bypass Abort Safety on Autocomplete**: Autocomplete queries must be debounced, enforce a minimum 3-character threshold, and pass an `AbortSignal` to cancel stale in-flight requests.
