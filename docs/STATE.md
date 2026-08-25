# STATE

Last updated: 2026-08-25 · Phase: **1 complete · 3 built (parser, embeddings, search)**

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
- The note list is hidden in the stream — one column, no competition. It comes back on home.
- Notes are editable from either side: the sidebar on home, or the pencil that appears on hover
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
- Nothing. Stopped at Checkpoint B.

## Next
1. **You:** review the data model (`packages/db/src/schema.ts`, `packages/types/src/*.ts`) and the
   service surface (`packages/core/src/{notes,folders}.ts`).
2. **Then Phase 2:** rich editor decision, ⌘K command palette, keyboard map, folder explorer with
   nesting and rename, Recent/Inbox routes.

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
  `scripts/sync-onnx-runtime.ts`), never a CDN. The model runs in a Web Worker, so it cannot cost a
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

## Fixed

- **Opening a note wrote to it.** Switching notes reused one editor instance, so the previous note's
  draft stayed in the pending-write ref while the `note` prop had already changed — and because
  `onSave` was re-created every render, the flush effect re-ran and committed it. The result was one
  note's text saved onto another, plus a reorder on every visit. The editor is now mounted per note
  (`key={note.id}`) and `save` is a stable `useCallback`, so a draft cannot outlive its note.

## Known gaps / debt
- **The embedding model has not run end to end.** This sandbox blocks huggingface.co downloads, so
  related-notes retrieval is verified only against a stub model (3 integration tests over real
  PGlite). Everything around it — queue, storage, ranking, UI states — is tested; the download needs
  one run on a real machine to confirm.
- Model weights come from Hugging Face on first use and are then cached by the browser. Self-hosting
  the weights is the obvious follow-up for a fully offline install.
- No CI workflow yet. Cheap to add whenever you want it: `typecheck + lint + test + build` on push.
- `search`, `embeddings`, `learning`, `parser`, `sync`, `config`, `ui`, `test-utils` are still
  `export {}` stubs; they fill in from Phase 3 on.
- PGlite runs on the main thread. Fine at this size; move to `@electric-sql/pglite/worker` when
  embeddings start competing for it (marked `ponytail:` in the code).
- Any domain event reloads the whole note list. Fine to ~200 notes, virtualize in Phase 2.
- The composer's grow-to-fit uses a measure-and-set effect. `field-sizing: content` would delete it,
  but Firefox lacks support — revisit when it lands.
- Composer metadata row shows word count today; it is the slot detected categories, tasks and dates
  plug into from Phase 3.
- No projects/tasks tables yet — they arrive with Phase 5, on their own migration.
- No way to delete a note yet (Phase 5). The local test data includes one note corrupted by the
  autosave bug before it was fixed.
- App shell is desktop-only so far — the mobile layout is Phase 6, and the panes currently just
  hide below `md`/`lg`.
- Landing page not built yet (Phase 8). The marketing direction is documented and the tokens exist,
  but nothing renders it.
- Product copy carries no roadmap/phase references any more; empty states describe the product,
  not the build order.
