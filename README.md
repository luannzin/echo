# echo

> **THE NOTE TAKER THAT LEARNS WITH YOU.**
> It doesn't think for you. It learns how you think.

Open source, no-AI, local-first note taking. Semantic search, automatic organization and adaptive
learning that run **on your machine** — no AI API key required for any core feature, ever.

Status: **Phase 0 — monorepo skeleton.** See [docs/PLAN.md](docs/PLAN.md) for the roadmap and
[docs/STATE.md](docs/STATE.md) for exactly where the build stands right now.

## Requirements

- [Bun](https://bun.sh) 1.3+

## Getting started

```bash
bun install
bun run dev
```

The web app runs at http://localhost:3000. No `.env`, no account, no server — local mode is the
default and always will be.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start every dev target (currently the web app) |
| `bun run dev:web` | Web app only |
| `bun run build` | Build everything through Turborepo |
| `bun run typecheck` | `tsc --noEmit` in every package |
| `bun run lint` | Biome check (lint + format + import sort) |
| `bun run lint:fix` | Biome check with safe fixes applied |
| `bun run test` | Unit and integration tests (`bun test`, real PGlite) |
| `bun run --cwd packages/db db:generate` | Regenerate migrations after a schema change |

## Layout

```text
apps/web            Next.js application (PWA target)
packages/types      Domain contracts (zod schemas, inferred types)
packages/core       Domain logic, services, event bus — no IO, no React
packages/db         Repositories + migrations (PGlite locally, Postgres on a server)
packages/parser     Deterministic content analysis: dates, tasks, keywords
packages/embeddings Local embedding runtime behind a swappable interface
packages/search     Lexical + semantic retrieval and hybrid ranking
packages/learning   Learning events in, learned rules out
packages/sync       Sync protocol and conflict resolution
packages/ui         Shared UI primitives (promotion target; coss lives in apps/web for now)
packages/config     Shared runtime configuration
packages/test-utils Fixtures and test helpers
tooling/tsconfig    Shared TypeScript presets
```

## Documentation

- [docs/PLAN.md](docs/PLAN.md) — phased implementation plan and checkpoints
- [docs/STATE.md](docs/STATE.md) — current state, decisions, open questions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layering and the rules that hold it together
- [docs/DESIGN.md](docs/DESIGN.md) — visual direction, tokens, type, shell anatomy

## License

TBD (intended: permissive open source).
