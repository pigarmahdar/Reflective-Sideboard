# Reflective Sideboard 🔮

<img width="1654" height="802" alt="Screenshot 2026-07-05 at 10 38 27 PM" src="https://github.com/user-attachments/assets/267bc6bf-1e6e-4616-9fbe-7d17a87c91c4" />

> A private, distraction-free journal for documenting your Magic: The Gathering journey. No accounts, no tracking, no analytics—just space to reflect on the cards, the brews, and the pods. Everything you write stays in your own browser.

I built **Reflective Sideboard** because I wanted a space that felt different from the usual MTG tools. So much of the community focuses on optimization: the most efficient decks, the fastest wins, the linear path to victory. I found myself wanting something else. I wanted a way to document my journey through the game, especially those weekly commander pods at my LGS. I wanted a place to sit with the cards I brewed, to track the interactions I discovered, and most importantly, to reflect on how I played and how I behaved in the pod.

## Why Reflective Sideboard?

We spend so much time optimizing our lists that we rarely give ourselves the space to reflect on the experience of play. How did you behave in that pod? Which card felt like it had a soul, and which felt like a chore? I know this kind of documentation isn't for everyone. If you’re only interested in the most efficient path forward, this probably isn't for you. But for those interested in being in that reflective space—in documenting the journey through the very game we play—then this sideboard is yours.

Click here to visit and use the platform: **https://pigarmahdar.github.io/Reflective-Sideboard/**

---
## The Core: A Journal for the Unscripted Brew

Reflective Sideboard is built on a few simple, intentional principles:
*   **Markdown that listens:** A clean, text-based editor that respects your focus.
*   **MTG-Awareness:** Through Scryfall integration, you can type `[[` or `@` to summon cards into your notes. The interface is not just a notepad; it’s a living document that speaks the language of the game.
*   **The Stimulus:** Every blank page is a terrifying thing. When you create a new entry, I’ve asked the app to whisper a few gentle, randomised prompts—invitations to think about your play style, the cards you're obsessing over, or the moments at your LGS that made you remember why you play. 

## Features for the Flow State
*   **Keyboard-First Navigation:** built this to keep your hands on the keys. `Cmd + N` spawns a new entry; `Cmd + P` flips between your draft and the finished look.
*   **Real-time Intelligence:** The sidebar is a reactive, "debounced" search engine. It’s butter-smooth, filtering through your archive of matchups and theorycrafting sessions without a stutter.
*   **Exportable Memory:** Your entries are yours. Export a single note as a `.md` file from the editor, or take your whole library with you as one JSON backup from the sidebar. Restore it on any machine and pick up where you left off.
*   **Light and Dark:** A theme toggle in the sidebar applies to the entire workspace — editor, previews, and modals included. Your choice is remembered, and on a first visit the app follows your operating system preference.

## How to Get Started
1.  **Spawn a space:** Press `Cmd + N`. Let the empty space breathe for a second.
2.  **Pick a thread:** If the blank page feels too wide, click one of the suggested prompts. It will settle into the editor like a seed.
3.  **Draft with Cards:** Use `[[` or `@` to summon your card references. It makes the theorycrafting feel as real as the cardboard in your hand.
4.  **Format:** Highlight text and use the standard shortcuts (`Cmd + B`, `Cmd + I`) to give your thoughts structure.

## Architecture Overview

Reflective Sideboard is engineered as a client-side Single Page Application (SPA). State resides in unified memory with serialized synchronization to `localStorage` to guarantee latency-free reading, writing, and filtering. It deploys as static assets on GitHub Pages — there is no server component.

```
                ┌─────────────────────────────────────────────┐
                │                   App.tsx                   │
                │  (Central State, Fuse.js Indexing, Local    │
                │   Storage Sync, Global Shortcuts, Backup)   │
                └───────┬──────────────┬──────────────┬───────┘
                        │              │              │
                        ▼              ▼              ▼
        ┌───────────────────────┐ ┌──────────┐ ┌────────────────────┐
        │    components/        │ │  hooks/  │ │     components/    │
        │       Sidebar         │ │ useTheme │ │   JournalEditor    │
        │ (Debounced Filter,    │ │(data-    │ │ (Markdown Editor,  │
        │  Tags, Theme Toggle,  │ │ theme +  │ │  Prompts, Card     │
        │  Library Backup)      │ │  tokens) │ │  Mention Parsing)  │
        └───────────────────────┘ └──────────┘ └─────────┬──────────┘
                                                         │ (Trigger [[ / @)
                                                         ▼
                                          ┌──────────────────────────┐
                                          │    services/scryfall     │
                                          │ (Abort-safe, 200ms       │
                                          │  debounced API layer)    │
                                          └─────────────────────────┘
                                                       ▼
                                          ┌──────────────────────────┐
                                          │  components/CardSidebar  │
                                          │ (Card art + oracle text) │
                                          └──────────────────────────┘
```

Theming is driven by semantic CSS custom properties (`--color-paper`, `--color-ink`, `--color-line`, and friends) declared for light mode and overridden under `:root[data-theme='dark']`. Components reference tokens rather than raw palette values, so one attribute flip repaints the entire workspace.

---

##  Feature Breakdown

### 1. Unified Local Persistence & Save Pipeline
*   **Reactive Sync Loop**: Active journals are managed under a single React state array (`entries: JournalEntry[]`). Every modification in the markdown editor triggers a downstream update using state mutators.
*   **Debounced Save vs. Auto-Save**: Although local state update is instantaneous, browser persistence utilizes an efficient hook-based write pipeline to write the stringified payload to `localStorage`.
*   **Visual Manual Save Sync**: `Cmd + S` / `Ctrl + S` suppresses the browser save dialog and flashes the "Saving…" indicator. Persistence itself already happened automatically on the preceding keystroke, so this is reassurance rather than a requirement — nothing is lost by ignoring it.

### 2. High-Performance Fuzzy Search & Debouncing
*   **Debounce Window**: Keyup events on the search bar trigger a 300ms debounce buffer. This prevents re-indexing on every stroke, drastically reducing CPU strain during rapid typing.
*   **Fuzzy Matching with Fuse.js**: When the search query exceeds whitespace, the filtered subset is compiled using a pre-configured `Fuse` instance.
This indexes fields with optimal distance weights, enabling misspelling tolerance for cards (e.g., matching "Tarmogoyf" to "Tarmogoyfe") and text content.

### 3. Rich Keyboard Shortcut Engine
A custom event listener intercepts target keystrokes to facilitate an entirely mouse-free writing environment.

*   **Global Layout Shortcuts**:
    *   `Cmd/Ctrl + N`: Instant entry initiation.
    *   `Cmd/Ctrl + P`: Real-time rendering toggles (Write vs. Preview layout views).
    *   `Cmd/Ctrl + /`: Launches/dismisses the Keyboard Shortcuts Guide overlay.
*   **Text Selection Wrapping Engine**:
    Keystrokes in the text area (`Cmd/Ctrl + B` for Bold, `Cmd/Ctrl + I` for Italic, `Cmd/Ctrl + E` for Inline Code, `Cmd/Ctrl + G` for Card bracket formatting, and `Cmd/Ctrl + K` for Link insertions) are handled by a cursor position offset tracker.

### 4. Predictive Scryfall Autocomplete (O(1) Typing Flow)
To prevent API rate-limiting and maximise keyboard efficiency:
*   **Token Triggers**: The editor monitors input on every keystroke. Typing `[[` or `@` sets an autocomplete trigger.
*   **Debounced Lookups**: Queries are debounced by **200ms** and routed to Scryfall's autocomplete API:
    `GET https://api.scryfall.com/cards/autocomplete?q={query}`
*   **Abort Safety**: Each new keystroke cancels any in-flight request through `AbortController`, so a slow response for an earlier query can never overwrite results for a later one.
*   **Minimum Query Length**: Suggestions begin two characters past the trigger. Scryfall itself needs three, so short bursts return quietly instead of erroring.
*   **Interactive Suggestion Portal**: The UI suspends normal text area key handlers. Custom handlers intercept `ArrowDown`, `ArrowUp`, `Enter`, and `Escape` to traverse the dynamic suggestion popup list.
*   **Syntax Insertion**: Selecting a card inserts `[[Card Name]]` at the cursor position and restores focus instantly to the editor.
*   **Graceful Degradation**: Every network failure path returns an empty result rather than throwing, so writing continues uninterrupted when Scryfall is unreachable.

### 5. New Entry Stimulus Engine (Smart Empty States)
Rather than displaying a stark blank canvas, Reflective Sideboard introduces a dynamic prompt injector:
*   **Condition Check**: Rendered only when `!interacted && !entry.title && !entry.content` is satisfied.
*   **Randomized Shuffling**: Draws from a pool of 16 prompts spanning 5 MTG strategy buckets — Match Reflection, Deckbuilding & Brewing, Growth & Goals, Community & Story, and Card Discovery & Commanders — presenting 6 at random per new entry.
*   **Interactive Insertion**: Clicking a prompt injects the text immediately, formats the selection, and shifts the cursor focus.
*   **Zero-Overhead Dismissal**: Listening to any native input focus vector (such as focusing the title field or body textarea) sets `interacted` to `true`, instantly purging the prompts from the Virtual DOM with no animation delay or layout shift. A manual dismiss control sits in the panel corner.

### 6. Theming and Appearance
*   **Whole-Workspace Toggle**: A Light/Dark segmented control in the sidebar footer repaints editor, preview, header, footer, modals, and card panel together — not merely the sidebar.
*   **Token-Driven**: Components consume semantic utilities (`bg-paper`, `text-ink`, `border-line`) backed by CSS custom properties rather than hardcoded palette values, keeping both themes in sync by construction.
*   **Preference Resolution**: A first visit follows the operating system via `prefers-color-scheme`; an explicit choice then persists to `localStorage` and wins thereafter.
*   **No Flash**: A blocking script in `index.html` applies the stored theme before first paint, so reloading never flashes the wrong palette.
*   **Reduced Motion**: `prefers-reduced-motion` collapses ambient animations and transitions.

### 7. Library Backup and Restore
*   **Full-Archive Export**: One click writes the entire journal to versioned JSON (`schemaVersion`, `exportedAt`, `entries`) — all entries, not just the currently filtered view.
*   **Validated Import**: Restoring parses defensively: malformed records are dropped, non-string tags filtered, missing identifiers regenerated, and any file yielding no usable entries is refused.
*   **Non-Destructive Until Confirmed**: Nothing touches application state until you accept a confirmation showing incoming versus current entry counts, so a bad file cannot silently wipe a good library.
*   **Per-Entry Markdown**: Individual notes still export as `.md` from the editor for sharing outside the app.

---

## Technology Stack

| Technology | Purpose | Key Benefit |
| :--- | :--- | :--- |
| **React 19** | UI Library | Declarative component architecture and performant rendering pipelines. |
| **Vite 6** | Build Tool | Lightning-fast HMR and production asset tree-shaking. |
| **TypeScript** | Language | Static typing guarantees safety for MTG card schemas and state transitions. |
| **Tailwind CSS 4** | Styling | Token-based theming through `@theme` custom properties, no config file required. |
| **Motion** | Animations | Clean, hardware-accelerated physics animations for overlays and transitions. |
| **Fuse.js** | Search Engine | Client-side, weight-tuned fuzzy indexing across title, content, and tags. |
| **React Markdown** | Preview Rendering | GFM-compliant markdown output with custom card-mention handling. |
| **Lucide React** | Icons | Consistent and beautiful SVG iconography. |
| **file-saver** | Export / Backup | Browser-native downloads for `.md` notes and JSON library archives. |

---

## A Note on the Build

I didn’t build this to prove anything about software; I built it because I wanted to see if I could use Google AI Studio to turn an idea into something tangible. It’s brief, it’s sweet, and it’s good enough that I’m proud to use it. It’s my exploration into using AI as a tool for personal clarity, and I hope it offers you a little bit of that same space.

*Technical Note: The project began as iterative prompting in Google AI Studio, but has since moved to being maintained from this repository — development happens locally, and deploys to GitHub Pages automatically on every push to `main`. There is no backend: your data stays in your browser's local storage, and the Scryfall API is called directly from your session.*

*Reflective Sideboard is still evolving. If you find a bug, or if a prompt feels too loud, let me know. I’m still listening.*

---

## Development

```bash
npm install
npm run dev      # Vite dev server on http://localhost:3000
npm run lint     # tsc --noEmit
npm run build    # production bundle into dist/
```

Deploys are handled by `.github/workflows/deploy-pages.yml`, which builds on push to `main` and publishes `dist/` to GitHub Pages. The asset base path is set from `PAGES_BASE` (defaulting to `/Reflective-Sideboard/`); change that variable if the site ever moves to a domain root.

A couple of things worth knowing before you poke around:

*   **Theme tokens live in `src/index.css`.** Light values are the defaults; dark ones override under `:root[data-theme='dark']`. Adding a colour means adding a token rather than reaching for a raw palette class.
*   **`?theme=light` / `?theme=dark`** forces a theme via URL, which is handy for visual testing and screenshots.
*   **Storage keys are not yet namespaced.** Entries sit under `spellbook_journal_entries` and theme under `rs-theme`, both in plain `localStorage`.
