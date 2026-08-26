# STATE

Last updated: 2026-08-26 · Phase: **4 complete — learning, retrieval and the performance pass**

Product: **echo** — open source, no-AI note taker that learns with you.

## Done

### Phase 0 — Skeleton
- Bun workspaces (`apps/*`, `packages/*`, `tooling/*`) + Turborepo task graph (`build`, `dev`,
  `typecheck`, `test`, `clean`).
- Biome as the single lint + format + import-sort tool. Config at `biome.json`, Tailwind CSS
  directives enabled in the CSS parser.
- `tooling/tsconfig` presets: `base`, `library`, `react-library`, `next`. Strict everywhere,
  including `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.
- Eleven empty-but-valid packages, each with a README stating its single responsibility:
  `types, core, db, search, embeddings, learning, parser, sync, config, ui, test-utils`.
- `apps/web`: Next.js 16 (Turbopack) + Tailwind v4, dark-first token set, three-pane app shell
  (`components/app-shell.tsx`) with honest empty states — no fake notes, no placeholder data.
- Docs: `README.md`, `docs/ARCHITECTURE.md` (layering + the 10 boundary rules), `docs/PLAN.md`,
  this file. `.claude/launch.json` so the dev server starts the same way every time.

Verified: `bun install` → `bun run typecheck` (12/12) → `bun run lint` (clean) → `bun run build`
(static build OK) → `bun run dev:web` renders the shell at http://localhost:3000 with no console
errors.

Installed versions: bun 1.3.14 · turbo 2.10.11 · biome 2.5.10 · typescript 7.0.2 · next 16.3.3 ·
tailwindcss v4.

### Checkpoint A — design system
- coss ui installed into `apps/web` via `shadcn@latest init -b base -p nova` + `add @coss/ui
  @coss/colors-neutral`. All 54 primitives present in `components/ui/`, Base UI under them.
- Registry files (`components/ui/**`, `hooks/use-media-query.ts`, `lib/utils.ts`) excluded from
  Biome — the CLI owns them, hand-edits would be overwritten.
- Brand tokens + dark shell tuning in `app/globals.css`; fonts wired through `next/font`
  (Geist / Geist Mono / Instrument Serif for display).
- Shell rebuilt to the reference direction: 56px icon rail with tooltips, collapsible navigation,
  quiet top bar, intelligence panel. Unbuilt destinations render disabled and name their phase.
- `docs/DESIGN.md` records the direction: loud marketing surface, quiet application surface.

### Phase 1 — Local persistence and note CRUD
- `@echo/types`: zod schemas as the single definition (`Note`, `Folder` + create/update inputs),
  types inferred. `DEFAULT_WORKSPACE_ID` lives here.
- `@echo/db`: PGlite + Drizzle. Schema in `src/schema.ts` (`folders`, `notes`), migrations generated
  by drizzle-kit and inlined into `src/migrations.generated.ts` by `bun run db:generate` so they
  ship to the browser. `migrate()` is versioned, transactional and idempotent, tracked in
  `echo_migrations`.
- `@echo/core`: `createEcho({ repositories })` composition root, typed event bus, note and folder
  services. Titles are derived from content (`deriveTitle`), never asked for. Clock and id factory
  are injected so services test deterministically.
- `apps/web`: `EchoProvider` opens PGlite lazily in the browser (`idb://echo`), note list, textarea
  editor, 500ms debounced autosave with a save indicator, empty states for loading/error/no-notes.
- Tests: 13 passing — `bun test`, no runner dependency. Services against an in-memory repository,
  repositories against a real in-memory PGlite migrated from the real migration files.

Verified in the browser: create note → type → autosave ("Saved") → reload → note and content
survive from IndexedDB, list ordered newest-first, no console errors.

### Capture UX
- Home is a composer, not a document: a big always-focused text area, no "New note" button
  anywhere. Enter commits, Shift+Enter is a new line, and nothing is written to the database before
  the writer commits — no empty notes accumulate.
- Committing opens the saved note in the editor with autosave; Esc or "Back to writing" returns to
  the composer.
- `apps/web` is a **static export** (`output: "export"`) — no server, no hydration mismatch, and
  self-hosting is copying `out/`.
- Writing is never gated on loading: the composer is focused and writable from first paint, and
  `capture` awaits the database itself rather than React state. Committing during a cold start
  works. The note list carries that latency instead, with coss `Skeleton` rows matching the real
  row geometry.
- A prompt is drawn at random per visit and fixed for that visit, so nothing shifts under the
  cursor.
- **Capture is optimistic end to end.** Enter puts the note on screen, clears the composer and
  switches view without awaiting anything; the database write happens behind it, and a failure
  removes the note again. The composer has no busy state because there is nothing to be busy about.
- The note that just arrived carries its own entrance: it rises in over 240ms and its highlight
  fades over the following second, so the eye can follow where the writing went.
- Saving from home moves into the **stream**: the composer travels from the centre of the screen to
  the bottom (FLIP, 340ms, `lib/flip.ts`) and every note appears as an entry, oldest first, with day
  separators and times. Writing continues from the docked composer; each new note lands at the
  bottom and the view follows it.
- The note list follows one rule in every view: the reader's collapse preference. The stream no
  longer force-hides it.
- Pointing at a note in the list targets it in the stream and walks the view to it: 150ms of intent
  before it moves, smooth scroll to centre, and no movement at all when the note is already on
  screen. Focus does the same, and `prefers-reduced-motion` gets an instant jump instead.
- Hovering moves a target down the stream: the row under the pointer takes a soft background and a
  marker on the leading edge, outside the text column so the writing never shifts. Focus does the
  same, so the target is not something only a mouse can move.
- Notes are editable from either side: the sidebar, or the pencil that appears on hover
  (and on keyboard focus) over an entry in the stream. Closing the editor returns to whichever
  screen opened it.
- Opening a note puts the caret after the last character and scrolls to it — opening means
  continuing.
- The rail's pen is Write: it returns home from anywhere and marks itself current.
- One ghost button in the top bar names the destination — "Stream" while writing, "Write" while
  reading — and runs through the same FLIP path as saving. Disabled until a note exists.
- Interface review pass (accessibility, layout, writing, typography, color, UI): skip link to the
  workspace, a heading on every view, rail placeholders kept focusable with `aria-disabled` so their
  tooltips can be read, the panel toggle hidden where the panel does not exist, 16px inputs on
  mobile, micro-labels off the 10px floor, logical properties throughout.
- The note panel keeps its 240px in the stream and only fades (`inert` when hidden). Unmounting it
  dragged the whole workspace sideways mid-transition; now the composer's travel is purely vertical,
  measured at 0px horizontal shift in both directions.
- The stream is one column, not a chat: every note is a full-width row of the same width, separated
  by hairlines, with a relative timestamp (`4m`, `3h`, `2d`, then the date) and a day label where the
  date turns over. No bubbles, no ragged right edge.
- Stream rows and the composer share one scroll container, which is what keeps their widths
  identical — a separate scroller made the column 15px narrower than the composer via its scrollbar.
  Rows carry no horizontal padding of their own, so text, timestamps, day labels, hairlines and the
  composer's edge all sit on one line at the column edge.
- No context and no custom hooks: `app/page.tsx` owns notes, selection and the database handle, and
  every component takes plain props. The editor owns its own save state, because nothing else needs
  to know about it.
- Motion tokens (`--ease-out-quart`, `--ease-in-out-quart`, `rise`, `settle`) live in the theme.
  Applied to: heading entrance, list stagger (28ms, first 8 items), save-button scale+fade,
  save-state indicator, focus ring, press feedback. Reduced motion still collapses all of it.

## In progress
- Nothing. Phase 4 closed with the performance and feedback pass below.

## Next
1. **You:** try `bun run build && bun run start` and confirm the production app opens its database —
   it did not before this pass, and that is the single most important thing to re-verify.
2. **Then Phase 5 — Organization:** unlimited nested folders, projects as first-class, drag and drop,
   the Inbox triage flow, and a tasks view fed by what the parser already detects.

## Decisions made
| Date | Decision | Why |
|---|---|---|
| 2026-08-25 | bun workspaces instead of pnpm | user directive |
| 2026-08-25 | Biome instead of ESLint + Prettier | user directive |
| 2026-08-25 | Turborepo kept | user directive, spec §3 |
| 2026-08-25 | Product is **echo**, lowercase in prose and UI | user directive; tagline: open source, no-AI note taker that learns with you |
| 2026-08-25 | Multilingual embeddings (`multilingual-e5-small`, ~120MB, 384-dim) | notes in pt-BR and any other language; English-only model rejected |
| 2026-08-25 | Plain textarea editor in Phase 1, rich editor later | capture speed first; Notion-style editor is a later upgrade |
| 2026-08-25 | Landing page as a route group inside `apps/web` | one deploy, shared UI primitives |
| 2026-08-25 | Bun's isolated node_modules linker (default in 1.3) | left as-is; Next builds fine under it |
| 2026-08-25 | coss installed into `apps/web`, not `packages/ui` | only one consumer exists; promoting a primitive is a move, not a rewrite |
| 2026-08-25 | Instrument Serif as the display face | free, high-contrast didone; a licensed face swaps in with one line in `layout.tsx` |
| 2026-08-25 | App is dark-only for now | both app references are dark; light mode is a token swap later |
| 2026-08-25 | Plain `nav` rail instead of coss `Sidebar` | the rail never expands and has no mobile sheet yet; `Sidebar` returns if that changes |
| 2026-08-25 | Drizzle ORM (user directive) | typed queries over one schema definition; drizzle-kit generates migrations |
| 2026-08-25 | Migrations inlined into TS by a script | browsers have no filesystem; regeneration beats hand-copying |
| 2026-08-25 | `bun test` instead of Vitest | same API, zero dependencies, runs real PGlite |
| 2026-08-25 | Schema grows per phase (`folders`, `notes` today) | tables nobody reads are speculative; `workspace_id` is already everywhere |
| 2026-08-25 | Note title derived from first meaningful line | capture must never demand a title dialog |
| 2026-08-25 | Folder deletion returns notes to the Inbox | notes are the user's; organization is not |
| 2026-08-25 | Composer + Enter to commit, no "New" button | capture must be felt, not clicked; nothing is stored until the writer commits |
| 2026-08-25 | Next static export (`output: "export"`) | user directive; the whole app is client-side, so a server only adds hydration risk |
| 2026-08-25 | No view-transition morph between composer and note | tried and dropped on request; the swap stays instant |
| 2026-08-25 | Saving stays on the composer, with an inline alert offering "Continue" | writing sessions are usually a burst of separate thoughts; opening each note would interrupt the next one |
| 2026-08-25 | Stream view after the first capture, sidebar hidden there | writing is a burst of separate thoughts; the stream keeps them in view without turning into a second list |
| 2026-08-25 | Saved-confirmation alert removed | the stream shows the saved note itself; a confirmation on top of it was noise |
| 2026-08-25 | FLIP for the composer's travel, not View Transitions | the element is re-created in a different subtree, and FLIP works everywhere without a fallback path |
| 2026-08-25 | No React context, no custom hooks | one owner component and props are enough at this size; state managers stay out until something actually needs them |
| 2026-08-26 | Learned rules derived on read, never stored | one place a belief about the reader can live, so "forget this" is a delete rather than a flag something else might still consult |
| 2026-08-26 | Vectors held in memory for the session | they are derived, bounded by the note count, and re-reading them per query was the most expensive thing the app did |
| 2026-08-26 | Vectors stored as `bytea`, old table dropped | half the storage and half the read time; derived data may be rebuilt rather than migrated |
| 2026-08-26 | Full-text search via a generated `tsvector` + GIN | 60x on the query that runs most often; the database keeps the index in step with the note |
| 2026-08-26 | Search answers in two passes, words then meaning | a local app must answer immediately; the model is allowed to be late and never allowed to block |
| 2026-08-26 | Production builds use webpack, dev uses Turbopack | Turbopack miscompiles PGlite's runtime module and the app cannot open its database; dev is unaffected |
| 2026-08-26 | PGlite's wasm served from `public/pglite` | the same arrangement as `public/ort`; a local-first app serves its own runtime rather than having a bundler assemble it |
| 2026-08-26 | `⌘Z` takes back the last capture | commit is one keystroke with no confirmation, which is only fair if undo is one too |

## Open decisions
- Rich editor engine for the post-MVP upgrade (Tiptap/ProseMirror vs BlockNote vs Lexical). Not
  needed until after Phase 2.
- License. README says TBD; permissive is the intent.

### Phase 3 — Intelligence
- `@echo/parser`: deterministic, offline content analysis with no model and no API key.
  - Dates via **chrono-node**: `tomorrow` / `amanhã`, weekday names, `in two weeks`, day-first
    numerics (`03/12` is 3 December). Portuguese parses first so numerics stay day-first, English
    covers the rest, and one phrase never yields two dates.
  - Deadlines: a date framed as a limit (`before Friday`, `até sexta`, `by`, `prazo`) is a deadline;
    a mention is not.
  - Tasks: checkboxes score 1.0, phrasing (`need to`, `preciso`, `tenho que`, `lembrar de`, `TODO`)
    scores lower. Nothing mutates the note.
  - Keywords: frequency ranking with English + Portuguese stopwords, ties broken alphabetically so
    the same note always parses the same way. `now` is injected for determinism.
  - 7 tests covering both languages, deadline vs mention, invalid dates and reproducibility.
- `@echo/embeddings`: `Embedder` interface (`embed` / `embedMany` / `embedQuery`) plus a local
  runtime — `Xenova/multilingual-e5-small` through transformers.js, so notes in any language land in
  one space. The ONNX runtime is **served by the app itself** (`public/ort`, synced by
  `scripts/sync-onnx-runtime.ts`), never a CDN. All eight build variants are synced — the runtime
  picks between the plain, jsep, asyncify and jspi builds at load time based on what the browser
  supports, and a missing one fails as "no available backend". Only the chosen pair is downloaded. The model runs in a Web Worker, so it cannot cost a
  keystroke. A failed load is forgotten rather than cached, so a dropped connection costs one retry.
- `@echo/search`: hybrid ranking — semantic 0.6, lexical 0.3, recency 0.1, coefficients as
  configuration. Recency halves every 14 days. `relatedTo` deliberately ignores recency: relatedness
  is about what a note is about. Lexical side is Postgres FTS with the `simple` configuration, so no
  language is privileged. 8 ranking tests.
- `@echo/core` analyzer: one pass at a time, driven by note events, queue derived from the database
  itself (`pending`), so a failure costs a retry and never a lost note. Awaitable — asking for a pass
  while one runs extends it instead of starting a second.
- Wired into the composer: as you type, outlined badges with a small colored dot report `Task` and
  `Due <word>`. Parsing rides `useDeferredValue`, so it runs after the keystroke, never in front of
  it — on a 5,400-character note that took the per-character cost from ~5.7ms to ~2.6ms.
  Local, synchronous, nothing to wait for. Only deadlines get a chip — a date merely mentioned stays
  silent, because one good suggestion beats three noisy ones.
- The intelligence panel is now **Related**: the notes closest in meaning to the open note or to
  what is being written, with a match percentage, debounced 400ms behind the keystroke. It says when
  it is still reading, and says plainly when the model could not load instead of looking empty.
- Panel preferences (notes, intelligence) persist in `localStorage` under `echo:*`. Both panels
  render **closed**, matching the prerendered markup exactly, then animate open to the stored
  preference on mount (width + opacity, 260ms). Nothing jumps on first paint; the panels arrive.

### Phase 4 — Adaptive learning
- `@echo/learning`: corrections in, rules out, as pure functions over an event list. Weight decays by
  half every 30 days, so a reader who changes their mind is followed rather than argued with. One
  correction lands at 0.5 confidence, two at 0.67 — confident, never certain, and nothing is claimed
  as learned below 0.6.
- Rules are **derived on every read, never stored**: deleting the events behind a rule is the only
  way it exists, which is what makes "forget this" a real promise instead of a hidden flag.
- Wired through the product: a learned rule can quiet a signal the parser found but never invent one,
  a dismissed duplicate never comes back, and opening a search result feeds `interactionScore` —
  weighted smallest on purpose, enough to break a tie and never enough to outrank an answer.
- The intelligence panel's **Learned** section says what echo has worked out in the reader's own
  words, with an undo on each line. Every signal chip carries a "why", phrased as the phrase that
  gave it away plus how often the reader has agreed.

### Performance pass — measured, not assumed
Benchmarked against real PGlite with a generated corpus. Before → after, per interaction:

| Path | 2,000 notes | 10,000 notes |
| --- | --- | --- |
| Lexical search (per query) | 376ms → **5ms** | ~2s → **21ms** |
| Related notes (per pause in typing) | 448ms → **2ms** | ~2.3s → **8ms** |
| One palette search, end to end | ~820ms → **~7ms** | — → **~30ms** |
| Note list refresh (per autosave) | 7ms → **0ms** | 14ms → **0ms** |

What changed:
- **Full-text search is an index, not a scan.** `notes.search` is a stored `tsvector` generated by
  the database from the note itself, with a GIN index over it. Title carries weight A and body B, so
  a note *about* the question outranks one that merely mentions it. The last word of a query is a
  prefix match, so results keep up with typing rather than catching up.
- **Vectors are resident.** `createVectorIndex` (`@echo/search`) holds every embedding in one
  contiguous `Float32Array` and compares in place — no allocation per candidate, no round trip. It is
  filled in the background after the notes are on screen, and patched as each vector is written, so
  it is never re-read.
- **Vectors are stored as bytes** (`note_vectors`), not a Postgres array of reals. Reading ten
  thousand went from 2.2s to 1.3s and the storage halved. The old table was dropped rather than
  converted — derived data is the one thing a migration may throw away.
- **The note list is applied, not reloaded.** Domain events patch the array in place. Every autosave
  used to re-read the workspace and replace the array, which re-rendered every row in the stream.
- **Search never scans the corpus.** Each half nominates up to 60 candidates and only those are
  ranked; `rank()` now blends precomputed scores and no longer touches vectors at all.
- **The stream stops paying for what is off screen** (`content-visibility: auto`), and each row is
  memoized, so moving the pointer down the column re-renders two rows rather than the notebook.
- **The analyzer embeds in batches of 8** rather than one note at a time, and publishes each vector
  as it is written.
- Selecting a note names its columns: the table carries a `tsvector` and `select *` would have
  returned a second copy of every note on the query that runs most often.

### Feedback pass — nothing hangs, nothing lies
- **Search runs in two passes.** Words come back from the index immediately; meaning follows when the
  model has answered, and the results re-order. Previously a single `Promise.all` awaited the query
  embedding — and a model that never resolved (a slow or blocked download) froze search completely,
  with no error and no timeout. Retrieval now refuses to wait on a model that is not ready.
- **The model download is visible.** `EmbedderStatus` (`idle | loading | ready | unavailable`) crosses
  the worker boundary with real progress, and the panel shows it: a hairline, a percentage, and one
  line saying it happens once and that everything else works meanwhile.
- **The Related panel's silence means one thing only.** Model loading, notes not read yet, a failed
  model and "nothing matches" are four different messages; before, all four were the same empty state.
- **Search results show why they matched** — the query's words marked in the title and in the line
  they appear on, rendered as text nodes rather than markup built from a note.
- **Capture is reversible.** `⌘Z` with an empty composer takes the last note back: it leaves the
  screen, leaves the database, and its words return to the composer with the caret where it was. The
  composer's metadata row names the shortcut for the moment it applies. Commit is one keystroke, so
  undo has to be too.
- A dead embedding worker now rejects its outstanding requests instead of leaving promises unsettled.

### Production build — it did not work before this pass
`bun run build && bun run start` produced an app that loaded and then could not open its database:
`TypeError: m.instantiateWasm is not a function`. Dev was fine, which is why it went unnoticed.

- The cause is Turbopack, not minification or `transpilePackages` — both were ruled out by
  experiment. Turbopack builds a namespace object for PGlite's internal runtime module whose
  `instantiateWasm` binding is never initialised. **Production builds now run through webpack**
  (`next build --webpack`); dev stays on Turbopack.
- PGlite's WebAssembly is served by the app itself from `public/pglite`, synced by
  `scripts/sync-pglite-runtime.ts` — the same arrangement `public/ort` already had, and the
  documented answer for bundlers that cannot follow PGlite's `new URL()` pattern.
- `@echo/embeddings` no longer re-exports its local runtime; it lives at `@echo/embeddings/local`.
  Importing the interface used to drag transformers.js, and through it a native `onnxruntime-node`
  binary, into every consumer's graph. Only the worker that runs the model needs it.
- `apps/web/tsconfig.json` excludes `out` and `.next`. Stale build output was being typechecked.

Verified in the built export: database opens, capture works, undo works, semantic search finds the
HEREZE note from "merchant inventory", results are highlighted, and the model download reports
progress — with an empty console.

### Animation pass
Reviewed against Emil Kowalski's framework and corrected:
- The model progress bar animates `transform: scaleX` on a linear curve, not `width` on an easing
  curve — a progress report many times a second should not go through layout, and a bar that eases
  looks like a download speeding up and slowing down.
- Panel toggles are 180ms, not 260ms. They are bound to a keystroke pressed all day.
- Press feedback on every hand-rolled control (note list, related notes, editor back). The coss
  `Button` already depresses via its shadow; these had nothing.
- The composer's save button splits its timings: 200ms to arrive, 120ms to answer a press. The
  entrance is opacity alone, so `transform` can mean "pressed" and nothing else.
- The arrival glow is cleared after it plays. Left set, re-entering the stream lit the row again and
  told the reader a note had just landed when it had been there an hour.

## Fixed

- **Opening a note wrote to it.** Switching notes reused one editor instance, so the previous note's
  draft stayed in the pending-write ref while the `note` prop had already changed — and because
  `onSave` was re-created every render, the flush effect re-ran and committed it. The result was one
  note's text saved onto another, plus a reorder on every visit. The editor is now mounted per note
  (`key={note.id}`) and `save` is a stable `useCallback`, so a draft cannot outlive its note.

## Known gaps / debt
- ~~The embedding model has not run end to end.~~ **It has.** Verified in the production build:
  model downloads with visible progress, notes are embedded, and "merchant inventory" finds the
  HEREZE note by meaning alone.
- `public/ort` is ~80MB of runtime variants and ships in the static export. Trimming it to the
  variants a target browser actually loads is a deployment-time optimisation, not a correctness one.
- Model weights come from Hugging Face on first use and are then cached by the browser. Self-hosting
  the weights is the obvious follow-up for a fully offline install.
- No CI workflow yet, and this pass is the argument for one: the production build was broken and
  everything green — `typecheck`, `lint`, `test`, even `build` — said otherwise, because nothing ever
  loaded the built output. A CI step that serves `out/` and asserts the database opens would have
  caught it.
- `sync`, `config`, `ui` and `test-utils` are still `export {}` stubs.
- **PGlite still runs on the main thread.** Moving it to `@electric-sql/pglite/worker` was built and
  reverted: PGlite's bundled data loader reads `window.location` to find its own files, so the worker
  build throws `window is not defined` before `fsBundle` is ever consulted. The `ponytail:` note in
  `packages/db/src/browser.ts` records it. Worth revisiting — it would also make a second tab safe
  through leader election, which today is genuinely unhandled: two tabs open two databases over one
  IndexedDB.
- The note list is capped at 200 rows by the repository. Beyond that the stream needs real
  virtualization; `content-visibility` buys the paint cost back but every note is still a React
  element and a DOM node.
- The composer's grow-to-fit uses a measure-and-set effect. `field-sizing: content` would delete it,
  but Firefox lacks support — revisit when it lands.
- The composer's metadata row now carries three things (word count, `Local · private`, and the undo
  hint). Folder and project suggestions want the same slot in Phase 5; it may need to become a row
  rather than a line.
- No projects/tasks tables yet — they arrive with Phase 5, on their own migration.
- The only way to delete a note is `⌘Z` immediately after writing it. Deleting an older note arrives
  with Phase 5, alongside archive and move.
- App shell is desktop-only so far — the mobile layout is Phase 6, and the panes currently just
  hide below `md`/`lg`.
- Landing page not built yet (Phase 8). The marketing direction is documented and the tokens exist,
  but nothing renders it.
- Product copy carries no roadmap/phase references any more; empty states describe the product,
  not the build order.
