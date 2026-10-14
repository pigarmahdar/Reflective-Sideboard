# Local-First Positioning: Architecture Assessment

*Written 2026-10-09, following the theme/footer work. Decision document — no code changed as a result of it yet.*

## TL;DR

The premise that local-first conflicts with the AI features is **false**: there are no AI features. `@google/genai` is declared but never imported anywhere in `src/`. The "reflective prompts" are a hardcoded 17-item array shuffled client-side with `Math.random()`. Nothing needs to be given up.

**Double-click-to-open works, and is verified.** Plain static files do not (Chrome blocks ES modules from `file://`), but a fully inlined single HTML file — 638KB, zero external references — renders correctly with no console errors and persists data across reloads. For a non-technical audience this is close to zero-friction distribution.

Three things still need attention: two remote assets (fonts, texture) that break the offline promise today, one latent bug (a font family that has never loaded), and shared-storage key hygiene, since all `file://` pages occupy one origin. Storage capacity is a non-issue, measured at 1,200+ entries against the conservative quota floor.

The main product trade-off surfaced by the measurements is not storage or AI at all — it is that **offline card art is impossible without a service worker or desktop wrapper**, and neither exists in the single-file shape.

_(§3 records a conclusion in my first draft that measurement reversed.)_


---

## 1. Current network dependencies (audited)

| Dependency | Where | Offline behaviour | Verdict |
|---|---|---|---|
| Google Fonts CSS `@import` | `src/index.css:1` | Falls back to system stack; layout shift on every load | **Must fix** |
| `transparenttextures.com/felt.png` | `src/App.tsx:301` | Texture silently absent (dark mode only, 2% opacity) | Fix or drop |
| Scryfall API (`autocomplete`, `cards/named`) | `src/services/scryfall.ts` | Degrades safely — see below | Keep, add messaging |
| `@google/genai` | `package.json` deps | Never called | **Delete** |
| `express`, `dotenv`, `@types/express` | devDeps/deps | Server code absent from repo | **Delete** |
| `.env.example`, `metadata.json` | root | AI Studio scaffolding only | **Delete** |

### Scryfall already degrades correctly

Every failure path returns `[]` or `null` rather than throwing (`scryfall.ts:15,26,28,38,42`). Offline, autocomplete yields no suggestions and card previews show "Card not found." **Writing continues to work**, which is the property that matters for a journaling tool. No resilience work needed — only honest signalling so users understand *why* suggestions stopped appearing rather than concluding the app is broken.

Note `autocomplete()` requires `query.length >= 3` while the editor triggers at `>= 2` (`JournalEditor.tsx:154`), so single-character queries silently return nothing. Pre-existing, harmless, worth knowing.

### Unused dependency confirmed

```
grep -rnE '@google/genai|GoogleGenAI|genai|GEMINI_API_KEY|generateContent' src/
→ NO MATCHES
```

Removing these shrinks install size and deletes the AI Studio fingerprint. Verify `express` truly is unused before dropping — it may back a dev proxy not present in this checkout.

---

## 2. Measured risks

### Storage capacity — NOT a risk

Realistic entry sizes (UUID + title + body + 4 tags + two ISO timestamps), encoded as UTF-8 JSON:

| Entry length | Bytes | @2MB quota | @5MB | @10MB |
|---|---|---|---|---|
| 100 words | 1,298 | 1,615 | 4,039 | 8,078 |
| 400 words | 4,298 | 487 | **1,219** | 2,439 |
| 1,500 words | 15,298 | 137 | 342 | 685 |

A dedicated user writing one detailed match recap per week for a decade reaches ~52MB of medium entries — which exceeds quota. But at 1,200 medium entries the practical ceiling is roughly **23 years of weekly journaling**. IndexedDB (needed for a file-backed approach anyway) lifts limits by orders of magnitude, so this resolves itself if the storage-model question is answered for other reasons.

Quota figures are browser-dependent and should be treated as estimates; the ~5MB-per-origin number is the conventional floor for `localStorage`.

### Font payload — cheap enough to settle the question

Measured from Google's own CDN:

- **All subsets, all styles: 331KB across 32 files**
- **Latin subset only: 98KB across 6 files** ← what an English-language MTG journal needs

Latin files cover: Plex Mono 400 normal / 400 italic / 500 / 600, Plex Sans 400 normal / 400 italic / 500 / 600 / 700. Self-hosting costs under 100KB and removes both the network dependency and the render-blocking `@import`. Subset-only is correct here; shipping Cyrillic/Greek/Vietnamese ranges buys nothing.

### Latent bug: Playfair Display has never loaded

`--font-serif: "Playfair Display", Georgia, serif` (`index.css:7`) but the Google Fonts import requests only IBM Plex Mono and Sans. Consequently the entry-title input (`JournalEditor.tsx:455`, `font-serif`) renders in **Georgia today, and always has**. Nobody noticed because both are serifs.

Decision required, independent of offline work: either bundle Playfair (~30–60KB latin) or delete the dead token and name the fallback honestly. Recommendation: **delete it** — the design intent appears to have been "a serif for titles," which Georgia/system serif satisfies, and carrying a phantom reference invites someone to "fix" it by adding a fourth webfont.

---

## 3. The per-origin problem — MEASURED, and partly wrong in my first draft

This is the issue that most shapes distribution. I initially wrote it up from general knowledge; it is now **empirically tested**, and one conclusion reversed.

### Measured facts (Chrome, headless, this machine)

**All `file://` pages share one storage origin.** `location.origin` reports the literal string `file://`, not an opaque/null origin. A page at `.ftest/a.html` wrote `localStorage['shared']='FROM-A'`; a page in a *different directory*, `.ftest/subdir/c-reader.html`, read it back successfully. Data also survived repeated reloads (counter incremented 1→2→3), matching the HTTP control.

**Consequence — good news:** moving or renaming the single-file app does **not** lose journals. Dropping it on a Desktop versus an external drive is fine. My first draft claimed otherwise; that was wrong.

**Consequence — remaining hazard:** because the origin is shared, *every* local HTML file on the user's machine reads and writes the same `localStorage` bucket as Reflective Sideboard. Two failure modes:

- **Collision.** Our keys are generic enough to matter: `spellbook_journal_entries` (low risk, distinctive) and `rs-theme` (**higher risk** — short, plausible, and another local app could clobber it).
- **Eviction.** Clearing "browsing data" wipes every `file://` app at once, silently.

Also confirmed: **plain double-clicking the current build cannot work.** Vite emits `<script type="module">` plus absolute `/assets/...` paths, and Chrome blocks module scripts from `file://` with a CORS refusal (`Cross origin requests are only supported for protocol schemes: chrome, …, http, https, …`). Setting `base: './'` fixes the paths but not the module restriction — this is a spec-level block, not a configuration issue.

The remedy is **full inlining**, which works: a single self-contained `index.html` (638KB, zero external asset references) loaded from `file://` with **0 CORS errors and 0 console errors**, React mounting normally and rendering the complete UI. Verified via `vite-plugin-singlefile`.

### Origin matrix (measured where marked)

| Delivery | Origin | Shares data with |
|---|---|---|
| Single-file `file://` *(tested)* | `file://` | **all other `file://` pages** |
| Multi-asset build opened via `file://` | n/a | **fails to load** *(tested)* |
| `http://localhost:3000` | `localhost:3000` | itself only |
| `https://<deployed-host>` | that host | itself only |

So the real migration cliff is **`file://` ↔ any HTTP(S) origin**, not between file locations. Crossing that boundary still looks like total data loss to a user. Mitigations, cheapest first:

1. **Pick one delivery shape and never mix.** Simplest, and now better informed: staying purely on `file://` is safe against renames.
2. **Prominent export/import** (shipped in the footer work). Makes crossing possible, if manual.
3. **Namespace storage keys** — prefix everything (e.g. `sideboard:v1:entries`) and version the schema, to reduce collision risk from the shared `file://` bucket. Cheap; worth doing regardless of distribution choice.
4. **File System Access API** — data lives in a user-chosen file, sidestepping origin semantics entirely. Note this is *not* needed to survive renames (fact 1), so its justification is now durability against eviction, not mobility.
5. **Desktop wrapper** — stable single origin plus real filesystem.

Point 4 is the genuine fix for the separate problem of browser-data clearing wiping a journal that exists nowhere else: it converts "your notes live in a browser cache" into "your notes are a file you own."


---

## 4. Distribution options

| | Single-file `file://` | PWA over HTTP | Tauri desktop | Electron |
|---|---|---|---|---|
| User experience | Double-click one HTML file | Install from URL | `.dmg`/installer, real window | Same |
| Verified working here? | **Yes** *(tested)* | Not tested | Not tested | Not tested |
| Offline after first load | Yes (fully inlined) | Yes, via service worker | Yes | Yes |
| Survives rename/move | **Yes** *(tested — shared `file://` origin)* | n/a | Yes | Yes |
| Cross-origin migration risk | Against HTTP(S) only | Against `file://` | None | None |
| Shared-storage collision | **Yes** — all local HTML files | No (unique origin) | No | No |
| File System Access | Unverified on `file://`§ | Chromium only¶ | Native FS, unrestricted | Native FS |
| Card-art cache | None available† | Service worker Cache API | Real disk cache | Real disk cache |
| Payload | ~638KB single file | ~600KB JS + 98KB fonts, multi-file | ~5–10MB binary | ~200MB |
| Build complexity | One plugin, one extra config | Manifest + SW | Rust toolchain | Node only |
| Auto-update | Manual (replace file) | SW refresh | Built-in updater | Built-in updater |

§ Untested; see §5.
¶ Support status unverified in this environment; see §5.
† **Significant limitation.** A service worker cannot register from `file://`, so offline *card art* is impossible in this delivery shape. Scryfall autocomplete and card previews require a connection either way (they are live API calls), but with HTTP hosting those responses and images can be cached for repeat lookups. With `file://`, every card view re-fetches. If offline card reference matters, that argues for Tauri or HTTP hosting rather than the single file.

### Recommendation

**Ship the single-file build as the default artifact; keep the normal multi-file build for optional HTTP hosting.**

The double-click-the-file proposition is viable and now proven end-to-end — it renders identically, persists across reloads, and survives being moved. For the stated audience (MTG players, not developers) it removes essentially all friction: no install, no admin rights, no browser extension, works from a USB stick or a synced Dropbox folder, and one email attachment distributes it.

Sequence:

1. **Phase A — offline hardening** (§6). Self-hosting fonts matters more here than originally judged: the single file currently still references `fonts.googleapis.com`, so an airplane user gets system-font fallback and layout shift.
2. **Phase B — namespace storage keys** before distributing, given the shared `file://` bucket (§3).
3. **Decide on FSA/Tauri later.** Neither is required for the core promise. The main open question is now offline *card art* († above), which is a product-feature decision rather than an infrastructure one.

Going straight to Tauri remains defensible if card-reference-offline is a hard requirement, but it commits to a Rust toolchain and a release pipeline to solve a problem the single file mostly shares anyway.


---

## 5. Browser-support claims requiring verification

Web search was unavailable in the environment where this was written (no search API key configured), so **none of the following could be checked against current sources.** They reflect prior knowledge and are flagged rather than asserted. Each materially affects feasibility and should be verified before implementation.

- Whether **Safari** supports the File System Access API (`showOpenFilePicker` / `showSaveFilePicker`). Historically unsupported; WebKit has shipped partial OPFS support, which is a different mechanism with different ergonomics.
- Whether **Firefox** supports it. Historically declined in favour of IndexedDB-based approaches.
- Current status of **Origin Private File System (OPFS)** across engines — potentially relevant as a portable alternative to FSA, with better Safari support but no user-visible file.
- Whether `file://` pages can call `showSaveFilePicker` at all.
- Exact `localStorage` quota per engine today (the 5MB figure is the conventional floor, not a guarantee).
- Tauri v2 stability and plugin surface as of this date.

If FSA turns out to be Chromium-only, that is close to disqualifying for a *primary* storage target aimed at general MTG players (a large macOS/Safari contingent), though it remains excellent as an optional enhancement with an IndexedDB fallback.

---

## 6. Proposed work, sequenced

**Phase A — offline hardening + single-file packaging (~half a day)**

1. Self-host IBM Plex latin subsets (98KB); replace the remote `@import` with local `@font-face`. **Required for the single file**, which otherwise still hits `fonts.googleapis.com`.
2. Delete the dead `Playfair Display` reference; rename `--font-serif` honestly.
3. Inline the felt texture as base64, or drop it (decorative, 2% opacity, dark-only — likely not worth 40KB). Currently referenced twice from `transparenttextures.com`.
4. Remove `@google/genai`, `express`, `dotenv`, `@types/express`, `.env.example`, `metadata.json`.
5. Add `vite-plugin-singlefile` as a second build target (`npm run build:single`), keeping the normal build for HTTP hosting. Already prototyped successfully — see §4.
6. Add an offline indicator: `navigator.onLine` + a badge near the existing save state in the editor footer, reading e.g. "Offline — card lookup unavailable."

Exit criterion: one HTML file that works with networking disabled, except Scryfall lookups, which say so explicitly.

**Phase B — storage hygiene (small, do before distributing)**

7. Namespace all keys (`sideboard:v1:*`) and version the schema, given every local HTML file shares the `file://` bucket (§3).
8. Decide whether FSA-backed files are wanted at all. Note the justification narrowed after measurement: renames are already safe, so this buys durability against browser-data clearing only.

**Phase C — optional, only if offline card reference becomes a requirement**

Tauri (or HTTP hosting with a service worker) to get real disk caching of card art. Not needed for the journaling core.


---

## 7. Open questions for you

1. Who is the actual audience — yourself, a small LGS group, or public release? This drives whether packaging effort pays off at all.
2. Is losing journals acceptable if a user clears browser data? If not, Phase B is mandatory, not optional.
3. Does anyone need multi-device sync? Nothing here provides it, and local-first makes it harder, not easier. Export/import is the current answer.
4. Should markdown exports (`.md` per entry, already implemented) become the canonical storage format rather than a backup convenience? That would make the journal grep-able and Git-friendly without any API work.
