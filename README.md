# echo

> **THE NOTE TAKER THAT LEARNS WITH YOU.**
> It doesn't think for you. It learns how you think.

Open source, no-AI, local-first note taking. Semantic search, automatic organization and adaptive
learning that run **on your machine** — no AI API key required for any core feature, ever.

Status: **Phase 6 — installable, offline, and at home on a phone.** Capture, search, related notes,
nested folders, Inbox triage and tasks all work locally. See [docs/PLAN.md](docs/PLAN.md) for the
roadmap and [docs/STATE.md](docs/STATE.md) for exactly where the build stands right now.

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
| `bun run dev` | Start the web dev server (the desktop window is opened on purpose, not here) |
| `bun run dev:web` | Web app only |
| `bun run dev:desktop` | Desktop app (builds the web app, then opens the Tauri window) |
| `bun run build:desktop` | Package the desktop app |
| `bun run build` | Build everything through Turborepo (the web app builds with webpack — see below) |
| `bun run start` | Serve the built static export (after `bun run build`) |
| `bun run typecheck` | `tsc --noEmit` in every package |
| `bun run lint` | Biome check (lint + format + import sort) |
| `bun run lint:fix` | Biome check with safe fixes applied |
| `bun run test` | Unit and integration tests (`bun test`, real PGlite) |
| `bun run --cwd packages/db db:generate` | Regenerate migrations after a schema change |

## Installing it

The web app is a PWA: open it, and the browser offers to install it. A service worker keeps a copy
of the shell, the WebAssembly and the model runtime, so after the first visit it opens with no
network at all — which is the normal way to use it, not a fallback.

The desktop app is the same build in a Tauri window. It needs a Rust toolchain and, on Linux,
`webkit2gtk-4.1`, `gtk+-3.0` and `libsoup-3.0`.

```bash
bun run dev:desktop
```

## A note on the web build

Development runs on Turbopack; production runs on webpack (`next build --webpack`). Turbopack
miscompiles PGlite's runtime module, and the result is an app that loads and then cannot open its
database — visible only in a built export, never in dev. `apps/web/next.config.ts` records the
details.

PGlite's WebAssembly and the ONNX runtime are copied into `public/` before every build, so a
deployment is a folder of files and nothing reaches for a CDN. Only the model weights are fetched on
first use, once, and then cached by the browser.

## Layout

```text
apps/web            Next.js application (PWA)
  app/              route entry and the component that owns application state
  modules/          one folder per feature, each with its own _components
  shared/           components and helpers more than one module needs
apps/desktop        Tauri shell around the same web build; no business logic in Rust
packages/types      Domain contracts (zod schemas, inferred types)
packages/core       Domain logic, services, event bus — no IO, no React
packages/db         Repositories + migrations (PGlite locally, Postgres on a server)
packages/parser     Deterministic content analysis: dates, tasks, keywords
packages/embeddings Local embedding runtime behind a swappable interface
packages/search     Lexical + semantic retrieval, hybrid ranking, destination suggestions
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
