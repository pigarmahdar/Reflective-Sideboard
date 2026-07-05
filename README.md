# Reflective Sideboard 🔮

An advanced, offline-first journaling and theorycrafting web application for Magic: The Gathering (MTG) players. Built with **React 18**, **Vite**, **TypeScript**, and **Tailwind CSS**, Reflective Sideboard combines markdown journaling with live-updating Scryfall card database lookups, fuzzy search, and optimized typing mechanics.

---

## Architecture Overview

Reflective Sideboard is engineered as a client-side Single Page Application (SPA). State resides in unified memory with serialized synchronization to `localStorage` to guarantee latency-free reading, writing, and filtering.

```
                  ┌──────────────────────────────────────────┐
                  │                 App.tsx                  │
                  │   (Central State, Fuse.js Indexing,      │
                  │    LocalStorage Sync, Global Shortcuts)   │
                  └──────┬────────────────────────────┬──────┘
                         │                            │
                         ▼                            ▼
         ┌──────────────────────────────┐     ┌──────────────────────────────┐
         │     components/Sidebar       │     │  components/JournalEditor    │
         │  (Debounced Filter, Tags)    │     │  (Markdown Editor, Prompts)  │
         └──────────────────────────────┘     └──────────────┬───────────────┘
                                                             │ (Trigger [[ / @)
                                                             ▼
                                              ┌──────────────────────────────┐
                                              │      services/scryfall       │
                                              │   (API integration layer)    │
                                              └──────────────────────────────┘
```

---

## Deep Technical Feature Breakdown

### 1. Unified Local Persistence & Save Pipeline
*   **Reactive Sync Loop**: Active journals are managed under a single React state array (`entries: JournalEntry[]`). Every modification in the markdown editor triggers a downstream update using state mutators.
*   **Debounced Save vs. Auto-Save**: Although local state update is instantaneous, browser persistence utilizes an efficient hook-based write pipeline to write the stringified payload to `localStorage`.
*   **Visual Manual Save Sync**: To honor user expectations, `Cmd + S` / `Ctrl + S` acts as a manual trigger, invoking a visual state change (`isSaving` toggled via a synthetic timeout) that confirms physical integrity to the user without interrupting their writing.

### 2. High-Performance Fuzzy Search & Debouncing
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

useEffect(() => {
  const handler = setTimeout(() => {
    setDebouncedSearchQuery(searchQuery);
  }, 300);
  return () => clearTimeout(handler);
}, [searchQuery]);
```
*   **Debounce Window**: Keyup events on the search bar trigger a 300ms debounce buffer. This prevents re-indexing on every stroke, drastically reducing CPU strain during rapid typing.
*   **Fuzzy Matching with Fuse.js**: When the search query exceeds whitespace, the filtered subset is compiled using a pre-configured `Fuse` instance:
    ```typescript
    new Fuse(entries, {
      keys: ['title', 'content', 'tags'],
      threshold: 0.3
    });
    ```
    This indexes fields with optimal distance weights, enabling misspelling tolerance for cards (e.g., matching "Tarmogoyf" to "Tarmogoyfe") and text content.

### 3. Rich Keyboard Shortcut Engine
A custom event listener intercepts target keystrokes to facilitate an entirely mouse-free writing environment.

*   **Global Layout Shortcuts**:
    *   `Cmd/Ctrl + N`: Instant entry instantiation.
    *   `Cmd/Ctrl + P`: Real-time rendering toggles (Write vs. Preview layout views).
    *   `Cmd/Ctrl + /`: Launches/dismisses the Keyboard Shortcuts Guide overlay.
*   **Text Selection Wrapping Engine**:
    Keystrokes in the textarea (`Cmd/Ctrl + B` for Bold, `Cmd/Ctrl + I` for Italic, `Cmd/Ctrl + E` for Inline Code, `Cmd/Ctrl + G` for Card bracket formatting, and `Cmd/Ctrl + K` for Link insertions) are handled by a cursor position offset tracker:
    ```typescript
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.slice(start, end);
    
    // Dynamically wraps text, unwraps if already surrounded by matching delimiters,
    // and recalibrates the textarea's selection range to preserve user focus.
    ```

### 4. Predictive Scryfall Autocomplete (O(1) Typing Flow)
To prevent API rate-limiting and maximize keyboard efficiency:
*   **Token Triggers**: The editor monitors input on every keystroke. Typing `[[` or `@` sets an autocomplete trigger.
*   **Debounced Lookups**: As the user continues typing, queries are debounced and routed to Scryfall's autocomplete API:
    `GET https://api.scryfall.com/cards/autocomplete?q={query}`
*   **Interactive Suggestion Portal**: The UI suspends normal textarea key handlers. Custom handlers intercept `ArrowDown`, `ArrowUp`, `Enter`, and `Escape` to traverse the dynamic suggestion popup list.
*   **Syntax Insertion**: Selecting a card inserts `[[Card Name]]` at the cursor position and restores focus instantly to the editor.

### 5. New Entry Stimulus Engine (Smart Empty States)
Rather than displaying a stark blank canvas, Reflective Sideboard introduces a dynamic prompt injector:
*   **Condition Check**: Rendered only when `!interacted && !entry.title && !entry.content` is satisfied.
*   **Randomized Shuffling**: Pulls from 5 distinct MTG strategy/gameplay buckets, shuffling and slicing 6 random questions on initial entry creation.
*   **Interactive Insertion**: Clicking a prompt injects the text immediately, formats the selection, and shifts the cursor focus.
*   **Zero-Overhead Dismissal**: Listening to any native input focus vector (such as focusing the title field or body textarea) sets `interacted` to `true`, instantly purging the prompts from the Virtual DOM with no animation delay or layout shift.

---

## Technology Stack

| Technology | Purpose | Key Benefit |
| :--- | :--- | :--- |
| **React 18** | UI Library | Declarative component architecture and performant rendering pipelines. |
| **Vite** | Build Tool | Lightning-fast HMR and production asset tree-shaking. |
| **TypeScript** | Language | Static typing guarantees safety for MTG card schemas and state transitions. |
| **Tailwind CSS** | Styling | Highly responsive design without style-sheet bloating. |
| **Motion** | Animations | Clean, hardware-accelerated physics animations for overlays and transitions. |
| **Fuse.js** | Search Engine | Client-side, weight-tuned fuzzy indexing. |
| **Lucide React** | Icons | Consistent and beautiful SVG iconography. |

---

## Directory Structure

```
/
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx        # Tag filtering, debounced search, and entry lists
│   │   ├── JournalEditor.tsx  # Core Markdown editor, prompts engine, & keyboard handler
│   │   └── CardSidebar.tsx    # Live MTG card preview drawer
│   ├── services/
│   │   └── scryfall.ts        # Scryfall card fetching layer (named & autocomplete)
│   ├── App.tsx                # High-level state dispatcher & persistent controllers
│   ├── index.css              # Global styles & custom scrollbars
│   ├── main.tsx               # DOM Mounting point
│   └── types.ts               # Shared types, interfaces, & MTG models
├── index.html                 # Entry HTML and page metadata title
└── package.json               # Package manifests and dependency controls
```
