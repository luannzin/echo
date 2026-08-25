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
3. **Tauri holds no business logic.** Filesystem paths, notifications, shortcuts, tray — nothing else.
4. **Ranking lives in `@echo/search`.** Coefficients are configuration, not code buried in JSX.
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
| Plain textarea editor in Phase 1 | Rich text is a Phase 2 concern; capture speed comes first |
