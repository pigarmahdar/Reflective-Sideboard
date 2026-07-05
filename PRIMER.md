# Reflective Sideboard: Primer

Welcome to **Reflective Sideboard**, a dedicated journaling and theorycrafting platform for Magic: The Gathering (MTG) players.

This platform helps you log your matches, document deck brews, discover new synergies, and track your gameplay growth seamlessly within a focused, distraction-free environment.

---

## Core Features & Recent Enhancements

### 1. Journaling & Markdown Editor
Reflective Sideboard provides a clean, text-based editor supporting standard Markdown formatting.
*   **Write & Preview**: Toggle between a distraction-free **Write** mode and a polished **Preview** mode to see how your Markdown renders.
*   **Persistent Storage**: Your entries are automatically saved to your browser's local storage as you type, ensuring you never lose your theorycrafting notes.
*   **Document Statistics**: The footer area dynamically displays:
    *   **Word Count**: Real-time counter of total words.
    *   **Character Count**: Detailed character-level metrics.
    *   **Estimated Reading Time**: Calculated on a standard reading pace (~200 words per minute) to help gauge length.
*   **Manual Export**: Export any entry as a `.md` file directly from the editor for external use or local backup.

### 2. MTG Integration & Scryfall Autocomplete
Theorycrafting is enhanced through direct integration with the [Scryfall API](https://scryfall.com/).
*   **Instant Autocomplete**: While in **Write** mode, type `[[` or `@` followed by a card name to trigger an instant autocomplete suggestion panel. Press Enter to quickly insert the card link into your text.
*   **Card Previews**: In **Preview** mode, clicking or hovering over any card mention (e.g., `[[Black Lotus]]`) opens a dynamic sidebar providing full card details, including:
    *   High-resolution card art.
    *   Mana cost, type line, and Oracle text.
    *   Direct links to the official Scryfall database.

### 3. Keyboard Shortcuts Support
To keep your hands on the keyboard and maintain flow state, Reflective Sideboard includes rich keyboard shortcuts. Press **`Cmd + /` or `Ctrl + /`** at any time to toggle the shortcuts guide overlay.

#### System & Navigation
*   **Create New Entry**: `Cmd + N` or `Ctrl + N` (instantly spins up a new blank sideboard note).
*   **Toggle Write & Preview**: `Cmd + P` or `Ctrl + P`.
*   **Save Flash / Force Sync**: `Cmd + S` or `Ctrl + S` (manually triggers a visual saving indicator).
*   **Toggle Shortcuts Guide**: `Cmd + /` or `Ctrl + /` (can also close with `Escape`).

#### Markdown Editor formatting (Text Selection Helpers)
*   **Bold Selection**: `Cmd + B` or `Ctrl + B` (wraps/unwraps selection with `**`).
*   **Italic Selection**: `Cmd + I` or `Ctrl + I` (wraps/unwraps selection with `*`).
*   **Inline Code Block**: `Cmd + E` or `Ctrl + E` (wraps/unwraps selection with ```).
*   **Insert Web Link**: `Cmd + K` or `Ctrl + K` (inserts helper `[link text](https://)` format).
*   **Wrap with Card Notation**: `Cmd + G` or `Ctrl + G` (wraps selection with `[[ ]]` to tag cards).

#### Predictive Autocomplete
*   **Trigger Panel**: Type `[[` or `@`.
*   **Navigate Predictions**: Use the Up and Down Arrow keys (`↑` / `↓`) and press `Enter` to select. Press `Escape` to close the predictions.

---

### 4. New Entry Stimulus (Empty State Prompts)
When you create a brand-new entry, a curated, randomised selection of **reflective prompts** is presented directly in the editor space. These are designed to spark writing and overcome blank-canvas anxiety.

*   **Casual & Non-Intrusive**: Styled as light, muted bullet points (`✦`), they act as gentle whispers rather than a rigid template.
*   **Interactive Interaction**: Hovering over any prompt highlights it. Clicking on a prompt **automatically inserts it as the first line of your entry body** and focuses the editor.
*   **Instant and Unobtrusive Dismissal**: The moment you focus the Title field, click into the Editor body, or start typing, the prompts instantly disappear, yielding a clean, blank editor.
*   **Alternative Manual Dismissal**: A small, clean `×` icon is available in the top-right corner to clear the prompts space if you prefer starting purely from scratch.

#### Prompts Categories & Content
Each time an empty entry is created, **6 prompts are randomised** from the following pools:

*   **Match Reflection**
    *   *What matchup surprised you this week?*
    *   *Which decision are you still thinking about?*
    *   *What would you sideboard differently next time?*
*   **Deckbuilding & Brewing**
    *   *What's the deck idea that won't leave your head?*
    *   *If you could change one card in your current list, what would it be and why?*
    *   *What interaction have you discovered that nobody's talking about?*
*   **Card Discovery & Commanders**
    *   *What obscure or underplayed card did you find that deserves a second look?*
    *   *Which legendary creature has sparked a new Commander deck idea for you recently?*
    *   *What's a card from a recent set that completely changes how you build your sideboard?*
    *   *If you were to build a deck around a completely new commander today, who would it be?*
    *   *What hidden synergy did you find between a classic card and a newly spoiled one?*
*   **Growth & Goals**
    *   *What's one thing you learned about your play style recently?*
    *   *What archetype do you keep avoiding — and what happens if you try it?*
    *   *What would make you feel like a better player six months from now?*
*   **Community & Story**
    *   *What's the best play someone else made against you lately?*
    *   *Who at your LGS is brewing something you want to learn from?*
    *   *What moment at your last event made you remember why you play?*

---

### 5. Advanced Sidebar & Debounced Search
*   **Debounced Search Engine**: The sidebar filter search queries are debounced by **300ms** before calling Fuse.js. This ensures completely lag-free, butter-smooth typing even when you have hundreds of archived journal entries.
*   **Tag filtering**: Intersect entries by selecting one or more custom tags inside the collapsible sidebar.
*   **Responsive Layout**: Designed to render beautifully on mobile drawer panels and expansive desktop bento layouts alike.

---

## How to Get Started

1.  **Create**: Press `Cmd + N` or `Ctrl + N` to spawn a new sideboard entry.
2.  **Select a Prompt**: Click any of the randomised stimulus prompts to instantly set your entry focus, or just type your own heading.
3.  **Draft with Cards**: As you draft your thoughts, use `[[` or `@` to autocomplete card names.
4.  **Format Effortlessly**: Highlight your text and use `Cmd + B` or `Cmd + I` to instantly add Markdown bold/italic styling.
5.  **Review**: Switch views with `Cmd + P` or click the preview tab, click on any of your highlighted card tags, and view full art and card rulings instantly.
