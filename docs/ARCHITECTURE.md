# Architecture

## Layering

```text
apps/web  (React, Next.js)
   │  calls services, subscribes to events
   ▼
@echo/core        domain + application services, event bus, job contracts
   │  repository interfaces
   ▼
@echo/db          PGlite (local) · Postgres (server) — the only place SQL is written
   ▲
   │  jobs run off the editor's critical path
@echo/parser · @echo/embeddings · @echo/search · @echo/learning
```

The same domain runs in the browser, in Tauri, and on a self-hosted server, because nothing below
`apps/*` knows what a component is.

## Rules

1. **UI never touches the database.** Components call `@echo/core` services. If a component
   imports from `@echo/db`, the boundary is broken.
2. **The domain never imports React or DOM APIs.** `core`, `types`, `parser`, `search`, `learning`
   and `sync` are pure TypeScript and testable in isolation.
3. **Tauri holds no business logic.** Filesystem paths, notifications, shortcuts, tray, and the
   MCP transport — nothing else. The MCP server forwards a tool name and a JSON object into the
   web app and sends back what comes out; the tools themselves are declared in
   `apps/web/shared/lib/mcp.ts`, because that is where the domain is.
4. **Ranking lives in `@echo/search`.** Coefficients are configuration, not code buried in JSX.
   Five signals: meaning, words, context, recency and habit. Context is what a note's own words
   cannot say — the same project, the same concepts, the same fortnight, and the note this reader
   opens beside it — and it exists because meaning alone puts the wrong note first often enough to
   notice.
5. **Learning is event-driven.** Corrections emit `LearningEvent`s; rules are derived from the event
   log, never mutated ad hoc.
6. **Embeddings are derived data.** Note content is the source of truth; any embedding can be
   thrown away and rebuilt.
7. **Writes are optimistic and local.** No network on the path between a keystroke and durability.
8. **Inference never blocks the editor.** Parsing, embedding and ranking are debounced background
   jobs; the editor is sacred.
9. **Explicit beats inferred.** A user's stated choice is never overwritten by a prediction, in
   persistence or in ranking.
10. **Every external integration sits behind an interface** — embedding runtime, storage, sync
    transport.
11. **Observation is not correction.** What the reader looked at is recorded in `observations` and
    never reaches `@echo/learning`. A rule may only come from something the reader said.
12. **An assistant is a caller, not the reader.** Anything reaching echo over MCP may read and
    write notes, folders, categories and tasks, and may write nothing that claims to be the
    reader's own behaviour: no observations, no learning events, and categories recorded as `auto`
    so rule 9 still holds. Deleting is guarded in the tool rather than in the advice — a note must
    be archived first and a folder must be empty — because MCP's annotations are hints a client is
    free to ignore.

## Schema strategy

One schema, two hosts. PGlite locally and Postgres on the server run the *same* numbered
migrations, both with `pgvector`. `workspace_id` exists from the first migration so hosted
multi-user mode is an additive change, not a rewrite — but local single-user queries do not pay any
tenancy cost today.

## Job pipeline

```text
note content changes
  → save immediately (optimistic, local)
  → emit NoteUpdated
  → enqueue idempotent jobs: parse · embed · find neighbours · relationships · suggestions
  → UI receives updated derived data when it is ready
```

Two queues, not one. Embedding waits on a model; reading what a note says about time does not, so a
fresh install has a working timeline long before the first vector exists and a model that never
loads never holds it up. Both derive their queue from the database, so a failure costs a retry.

Jobs are durable rows, not in-memory promises, so a reload or a crash never leaves derived data
permanently stale.

## Recorded decisions

| Decision | Rationale |
| --- | --- |
| Bun workspaces + Turborepo | Single fast toolchain; Turbo keeps task graph and caching |
| Biome over ESLint + Prettier | One binary, one config, ~zero-config formatting and linting |
| PGlite + pgvector locally | Same SQL and same vector search as the server; no dialect fork |
| Multilingual embeddings | Notes are written in pt-BR and other languages, not English only |
| Drizzle ORM over raw SQL | Typed queries against one schema definition, and drizzle-kit generates the migrations |
| Migrations inlined into TypeScript | The browser has no filesystem; `bun run db:generate` regenerates them, so there is no hand-copied drift |
| `bun test` instead of Vitest | Same API, zero dependencies, and it runs real PGlite in-process |
| chrono-node for date detection | Dates people write ("in two weeks", "até sexta") are a deep problem; the regex version handled a fraction of it |
| Plain textarea editor in Phase 1 | Rich text is a Phase 2 concern; capture speed comes first |
| Temporal mentions as `jsonb` on one row per note | The window query runs when a view opens, never per keystroke; a note with no dates still needs its row, or it is re-parsed forever |
| Visits in `observations`, apart from `learning_events` | Rules are derived from corrections; being somewhere is not an opinion, and mixing the two would let navigation teach echo things nobody said |
| Anchors (`depois que comecei X`) resolved in `core`, not `parser` | When a project started is a fact about the corpus; the parser has none, so it names the anchor and core places it |
| A question is decomposed before it is searched | Time, place and framing are different questions from the subject; extracting them is what makes search precise, and showing them as removable chips is what makes hard filtering safe |
| Context weighted at 0.18, meaning reduced to 0.45 | Belonging must be able to pass a note that reads closer, and must not be able to pass one that reads much closer |
