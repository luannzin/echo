# Echo Note — Implementation Plan

Source spec: `notetaker-mvp-master-prompt.md` (60 sections).
Stack deltas from spec: **bun workspaces** (not pnpm), **Biome** (not ESLint+Prettier). Everything else as specified.

## Naming

The product is **echo** — open source, no-AI note taker that learns with you. Lowercase in prose and
UI, `@echo/*` for package scope.

## Non-negotiable architecture rules (spec §35, enforced by lint boundaries + review)

1. UI never imports `@echo/db` implementations — only `@echo/core` services.
2. `@echo/core`, `@echo/parser`, `@echo/search`, `@echo/learning` have **zero** React/DOM imports.
3. Embeddings are derived data; note content is source of truth.
4. Nothing expensive runs on the editor's keystroke path — parse/embed/rank live in a worker behind a debounce.
5. Explicit user value always beats inferred value in persistence and in ranking.

## Layering

```
apps/web (React/Next)
   ↓ services + events
packages/core         ← domain, no IO
   ↓ repository interfaces
packages/db           ← PGlite adapter (local) | pg adapter (server)
   ↓
packages/{parser,embeddings,search,learning}  ← pure/worker-side, called by core's job queue
```

---

## Phase 0 — Skeleton  ⛳ CHECKPOINT A

Deliverables:
- `package.json` root with bun workspaces (`apps/*`, `packages/*`, `server/*`, `tooling/*`), `turbo.json` pipeline (`build`, `dev`, `lint`, `typecheck`, `test`, `test:e2e`).
- `tooling/tsconfig` (base/next/node/react-library presets), `tooling/biome` shared config, root `biome.json` extending it.
- Empty-but-valid packages: `types`, `core`, `db`, `search`, `embeddings`, `learning`, `parser`, `sync`, `config`, `ui`, `test-utils` — each with package.json, tsconfig, `src/index.ts`.
- `apps/web`: Next.js App Router + Tailwind, one page rendering the 3-pane shell frame (static, no data).
- Scripts: `bun run dev|build|lint|typecheck|test`.
- `docs/STATE.md` initialized, `docs/ARCHITECTURE.md` stub, `README.md` skeleton.

Verify: `bun install && bun run typecheck && bun run lint && bun run build` clean; `bun run dev` serves the shell.

**Checkpoint A — you do:** add `AGENTS.md`/`CLAUDE.md` files, install COSS UI into `packages/ui`, drop any visual references. I stop and wait.

---

## Phase 1 — Local persistence + note CRUD  ⛳ CHECKPOINT B

- `@echo/types`: Note, Folder, Project, Task, Concept, Relationship, Suggestion, SearchResult, LearningEvent, SyncChange, UserPreference. Zod schemas as the single definition, types inferred from them.
- `@echo/db`: PGlite (`@electric-sql/pglite`) + `vector` extension, IndexedDB-persisted. Numbered SQL migrations in `packages/db/migrations/NNNN_*.sql` with a `schema_migrations` table. Repository objects per spec §5. Same SQL runs against server Postgres later — no dialect forks.
- Schema: `notes, folders, projects, tasks, concepts, note_concepts, note_tags, note_links, note_embeddings, learning_events, learned_rules, search_events, user_preferences, sync_changes`. `workspace_id` column present from day one, defaulted locally — no per-query tenancy code yet.
- `@echo/core`: services (`createNote`, `updateNote`, `moveNote`, …) + a tiny typed event bus emitting `NoteCreated/NoteUpdated/NoteMoved`.
- Web: note list + editor (plain markdown textarea for now), autosave with dirty-state indicator, optimistic writes.

Verify: unit tests on repositories against an in-memory PGlite; create/edit/reload persists across refresh.

**Checkpoint B:** you review data model + shell before UX work locks it in.

---

## Phase 2 — Writing UX  ⛳ CHECKPOINT C

- Editor upgrade decision point (see Open decisions #1).
- Command palette ⌘K (search + all commands from §19), keyboard map from §20.
- Folder explorer: nested tree, expand/collapse, rename, create child, context menu, keyboard nav. Virtualized list for notes.
- Recent / Inbox / Favorites routes. Real empty states.

Verify: Playwright — new note in 2 keystrokes, palette navigation, tree create/rename.

---

## Phase 3 — Intelligence  ⛳ CHECKPOINT D

- `@echo/parser` (pure, deterministic, heavily unit-tested): dates/deadlines (`tomorrow`, `before Friday`, `03/12`), task intent, keywords, entities, candidate concepts. No LLM.
- `@echo/embeddings`: interface `embed/embedMany` + transformers.js local model (`bge-small-en-v1.5` or `all-MiniLM-L6-v2`) in a Web Worker, WebGPU when available, WASM fallback. Model download is lazy + user-visible; app fully usable before it lands (lexical-only search degradation).
- `@echo/core` job queue: durable, idempotent jobs in a table, worker-driven, `NoteUpdated → parse → embed → neighbors → relationships → suggestions`.
- `@echo/search`: lexical (Postgres FTS in PGlite) + vector (pgvector cosine) + explicit weighted scorer per §13 with configurable coefficients; snapshot tests over a fixture corpus.
- Intelligence panel: related notes, detected task/date, duplicate warning. Accept/reject/ignore affordances.

Verify: fixture corpus of ~200 notes, ranking tests; "that note about production cache" finds the right note without word overlap.

---

## Phase 4 — Adaptive learning  ⛳ CHECKPOINT E

- `@echo/learning`: consumes LearningEvents, derives `learned_rules` (keyword→folder, phrase→date-intent, co-occurrence weights) with decay + confidence. Pure functions over event lists; no hidden state.
- Feeds folder/project suggestions and search re-ranking (`userPreferenceScore`, `interactionScore`).
- "Why?" affordance + Intelligence settings surface showing learned rules, with delete.

Verify: property tests — N corrections in one direction must flip the suggestion; explicit choices never overwritten.

---

## Phase 5 — Organization ✅

Unlimited nesting, drag & drop move (tree + note list), Inbox triage flow (accept suggested destination in one key), tasks view with due dates and source-note links. Destination suggestions come from a neighbour vote over the reader's own notes; corrections may damp a folder but never invent one.

Projects were deliberately not built — see `docs/STATE.md`. Nothing in the product distinguishes a project from a folder yet, so the entity is deferred rather than half-built.

---

## Phase 6 — PWA + Desktop ✅

Service worker, install manifest, offline-normal behaviour, mobile layout (bottom nav, sheets for both panels). Tauri app reusing the same web build.

The Rust side is a window and nothing else. Filesystem paths, notifications, a global shortcut and a tray are what Tauri is *for*, but nothing in echo asks for them yet — each arrives with the feature that needs it rather than as scaffolding.

---

## S1–S4 — Personal context

A four-part expansion running beside the phase plan, turning echo from a note app that reads notes
into one that holds a reader's history. Each part gets its own spec under
`docs/superpowers/specs/`, in dependency order:

| # | Sub-project | Covers | State |
|---|---|---|---|
| S1 | Temporal context | expressions → ranges, the personal timeline, "what changed since" | ✅ |
| S2 | Personal vocabulary | aliases, synonyms, concepts instead of tags, "you may also mean" | ✅ |
| S3 | Query understanding | question → filters, contextual reranking, search by memory | ✅ |
| S4 | Project memory | automatic brief, soft placement, organize inbox, "because you usually" | ✅ |

All four are done. Nothing in any of them needs an API key. S1's spec is
`docs/superpowers/specs/2026-08-26-temporal-context-design.md`; S2–S4 were built directly from the
decisions recorded in `docs/STATE.md`.

---

## Phase 7 — Sync

`@echo/sync` protocol (change log per §29, per-entity version, explicit conflict policy — last-writer-wins on scalar fields, content conflicts surfaced to the user, never silent). `server/api` + `server/sync` on Postgres+pgvector, same migrations. Auth only enters here.

---

## Phase 8 — Product polish

Landing page (§48) is built — `apps/www`. The rest runs in five parts; the spec is
`docs/superpowers/specs/2026-08-27-language-and-arrival-design.md`.

| # | Part | Covers | State |
|---|---|---|---|
| P8a | Language in the application | typed dictionaries, runtime locale, reason codes out of the domain, locale-aware dates | ✅ |
| P8b | Language on the site | two prerendered documents, `/` and `/pt-br`, hreflang, the Portuguese type pass | ✅ |
| P8c | Settings | the preference store, then language, storage, theme, motion, learned rules, export, reset | ✅ |
| P8d | Arrival | first run (§49's storage choice), a tour anchored to the real interface, a checklist derived from the notes | ✅ |
| P8e | Identity | the engraving and its motion, inside the app | ✅ |

Still open in this phase: a perf pass against a 10k-note seeded corpus, and the docs (local /
self-host / Postgres / desktop / deploy).

---

## Working protocol

- Each phase ends with: `bun run typecheck && bun run lint && bun run test` green, then `docs/STATE.md` updated (done / in-progress / next / decisions / known gaps) before I report.
- Checkpoints A–E stop for your input. Between checkpoints I keep going.
- Every deliberate shortcut gets a `ponytail:` comment naming its ceiling and upgrade path.

## Open decisions

1. **Editor engine.** Default: markdown textarea in Phase 1 → Tiptap in Phase 2 (ProseMirror, has the selection/decoration API the inline suggestions need). Alternative: stay plain markdown the whole MVP, cheaper and faster, less "premium".
2. ~~**Embedding model.**~~ Decided: `multilingual-e5-small`, and it is what both hosts already run
   (`packages/embeddings/src/local.ts` and `apps/desktop/src-tauri/src/lib.rs`). Semantic search in
   pt-BR needed nothing beyond that. Lexical search uses `to_tsvector('simple')`, which stems no
   language, so the two are treated identically there as well.
3. ~~**Landing page location.**~~ Decided: separate app, `apps/www`, deployed on its own.

## Risks I'm flagging now

- PGlite + vector extension in-browser is ~3MB wasm plus the model download; first-run needs a real loading story, not a spinner.
- Mobile Safari WASM memory limits will bite embedding generation on large notes — chunk and cap.
- Sync (Phase 7) is the single biggest chunk in this spec and delivers nothing until finished. Ship phases 0–6 first, no partial sync.
