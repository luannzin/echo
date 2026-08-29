<p align="center">
  <img src="assets/banner.svg" alt="echo" width="100%">
</p>

# echo

<!-- TODO: the app is not hosted yet (docs/STATE.md, "Deliberately not done: a hosted demo").
     Swap https://echo.example.com for the real deploy here and in the badge row below. -->

<p align="center">
  <a href="https://echo.example.com">Live Demo</a> | <a href="https://github.com/luannzin/echo/releases/latest">echo for Desktop</a>
</p>

<p align="center">
  <a href="https://echo.example.com"><img src="https://img.shields.io/badge/Live%20demo-echo-1A1AFF?style=for-the-badge" alt="Live demo"></a>
  <a href="docs/"><img src="https://img.shields.io/badge/Docs-in%20this%20repo-1A1AFF?style=for-the-badge" alt="Documentation"></a>
  <a href="https://github.com/luannzin/echo/releases/latest"><img src="https://img.shields.io/badge/Desktop-macOS%2C%20Windows%2C%20Linux-1A1AFF?style=for-the-badge" alt="Desktop builds"></a>
  <img src="https://img.shields.io/badge/AI%20API%20key-not%20required-F2F4FF?style=for-the-badge&labelColor=1A1AFF" alt="No AI API key required">
  <img src="https://img.shields.io/badge/Works-offline-1A1AFF?style=for-the-badge" alt="Works offline">
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-1.3+-1A1AFF?style=for-the-badge&logo=bun&logoColor=white" alt="Bun 1.3+"></a>
  <img src="https://img.shields.io/badge/License-TBD-8A8A8A?style=for-the-badge" alt="License: TBD">
</p>

**The note taker that learns with you.** It does not think for you, it learns how you think. You write one line and press Enter, and echo reads what you wrote: the deadline you mentioned in passing, the task hiding inside the sentence, the words you keep reaching for. It gets better at handing all of it back, and none of it leaves your machine.

There is no model provider behind any of this. Search, organisation and learning are ordinary code running over your own notes, so **no core feature ever requires an AI API key**. Real Postgres, compiled to WebAssembly, runs in your browser and keeps your notes there. Setup is a clone, an install and a dev server: no `.env`, no account, and no server to point it at.

<table>
<tr><td><b>Nothing to sign into</b></td><td>No account, no key, no server, no telemetry. The one thing that ever crosses the network is a multilingual embedding model, about 120 MB, fetched once the first time you search by meaning. Writing, filing and word search all work before it lands.</td></tr>
<tr><td><b>Search that takes the question apart</b></td><td>"notes about caching in payments" is two questions wearing one coat. echo pulls the subject away from the project, filters on each, and shows every filter as a chip that is one press from gone. It says how many notes it set aside, because a search that quietly ignores half of what you typed is one you stop trusting.</td></tr>
<tr><td><b>Every guess shows its work</b></td><td>A suggested destination arrives with the notes that argued for it: notes you can open and disagree with, rather than a percentage you can only accept. And because filing ten notes wrongly is a far worse afternoon than filing them one at a time, the Inbox works the whole pile out first and moves nothing until you press it.</td></tr>
<tr><td><b>It learns your words, not a dictionary's</b></td><td>You type <code>k8s</code>. Half your notes say <i>kubernetes</i> and the rest say <i>the cluster</i>. echo works that out from the company your words keep, so searching one finds the other. Learned rules are never stored: they are derived again from your corrections every time they are read, so deleting the correction is the only way the rule exists.</td></tr>
<tr><td><b>One pile, read back four ways</b></td><td>A stream, a task list, a timeline, and a page you write on. Tasks and dates are lifted out of ordinary sentences by a deterministic parser, and a task is only ever created where you agreed to the chip.</td></tr>
<tr><td><b>Made to be written in</b></td><td>A composer that never leaves the screen, Enter to commit and <code>Ctrl/Cmd Z</code> to take the last capture back, slash commands that write markdown rather than styles, a command palette, and a keyboard twin for every affordance a pointer has.</td></tr>
<tr><td><b>Yours on every machine</b></td><td>An installable PWA that opens with no network at all after the first visit, and the same build in a Tauri window on macOS, Windows and Linux, where it also offers an editor mode the website never does: your open notes along the top, a split view, a live preview, and a sticky note in a window of its own above everything.</td></tr>
<tr><td><b>Speaks English and Portuguese</b></td><td>Every word the interface says is read from a dictionary at render, and <code>bun run typecheck</code> is the translation completeness check. The site is two prerendered documents, one per language, with no redirect between them.</td></tr>
</table>

---

## Quick Install

### Requirements

- [Bun](https://bun.sh) 1.3 or newer. That is the entire list for the web app.
- The desktop build also wants a Rust toolchain, and on Linux `webkit2gtk-4.1`, `gtk+-3.0` and `libsoup-3.0`.

### Web

```bash
git clone https://github.com/luannzin/echo.git
cd echo && bun install
bun run dev
```

The app is at http://localhost:3000 and the marketing site at http://localhost:3001. There is nothing to fill in and no account to create: local mode is the default and always will be.

### Desktop

```bash
cd echo && bun install
bun run dev:desktop
```

That builds the web app and opens the Tauri window. `bun run build:desktop` packages it, and tagged builds land under [Releases](https://github.com/luannzin/echo/releases/latest).

### The one download

The embedding model (`multilingual-e5-small`, about 120 MB, 384 dimensions) is fetched from Hugging Face the first time you search by meaning, and the browser caches it from then on. It is multilingual on purpose: notes written in pt-BR have to search as well as notes written in English.

---

## Getting Started

| Command | What it does |
| --- | --- |
| `bun run dev` | App on 3000, marketing site on 3001 (the desktop window is opened on purpose, not here) |
| `bun run dev:web` | Web app only |
| `bun run dev:www` | Marketing site only |
| `bun run dev:desktop` | Desktop app: builds the web app, then opens the Tauri window |
| `bun run build:desktop` | Package the desktop app |
| `bun run build` | Build everything through Turborepo |
| `bun run start` | Serve the built static export, after `bun run build` |
| `bun run typecheck` | `tsc --noEmit` in every package |
| `bun run lint` | Biome check: lint, format and import sort in one pass |
| `bun run lint:fix` | The same check, with safe fixes applied |
| `bun run test` | Unit and integration tests (`bun test`, against real PGlite) |
| `bun run --cwd packages/db db:generate` | Regenerate migrations after a schema change |

---

## What it does with what you wrote

### Ask it the way you would ask a person

<img src="apps/www/public/shots/search.webp" alt="The command palette holding the query notes about caching in payments. A removable Payments chip has been lifted out of the query, sixteen notes are marked set aside, and the four payments notes are listed underneath." width="100%">

The palette separates the subject from the project, filters on each, and hands every filter back as a chip you can remove. The count of what it set aside sits on screen, next to the query that caused it.

### Every guess shows its work

<img src="apps/www/public/shots/inbox.webp" alt="The Inbox with notes to place. Each row offers one folder and, underneath, the sentences behind it: the notes already filed there, and the habit echo read out of them." width="100%">

Destinations are decided by a vote among neighbouring notes rather than by a classifier. Nothing is trained: every note you file is another voter, and the reason echo gives is a list of notes you can open and disagree with.

### A note arrives with the notes it belongs to

<img src="apps/www/public/shots/note.webp" alt="A note about payment retries open in echo, with concepts along the top and a panel of related notes beside it, each naming why it is related." width="100%">

Same project, written around the same time, usually opened together: the reason is a sentence and not a percentage, and the concepts along the top came out of the note itself, so any of them can be taken off.

### It learns your words, not a dictionary's

<img src="apps/www/public/shots/meaning.webp" alt="Searching for k8s. The first result contains the letters; the second is a note about a kubernetes rollout that does not, found by meaning rather than by spelling." width="100%">

Aliases are decided by near exclusive usage rather than by similarity, because what makes two words the same word is that you write one *instead* of the other. Your own notes are the whole of the evidence.

### Everything you write, kept four ways

| | |
| --- | --- |
| <img src="apps/www/public/shots/stream.webp" alt="The stream: notes stamped with when they were written and last edited, with the composer docked at the foot of the screen." width="100%"> | <img src="apps/www/public/shots/tasks.webp" alt="The task list: open tasks grouped under Due and No date, each showing the note it came out of." width="100%"> |
| **The stream.** Everything lands here first, in the order you wrote it, and the box you write in never leaves the screen. | **Tasks.** echo lifts the things to do out of ordinary sentences, and brings the dates those sentences mentioned with them. |
| <img src="apps/www/public/shots/timeline.webp" alt="The timeline: a This week band holding the deadlines echo found, and under it the days, each with the words that ran through them." width="100%"> | <img src="apps/www/public/shots/write.webp" alt="A sentence being written in echo. The composer shows a word count and a Due friday chip, and the panel beside it already lists the notes it connects to." width="100%"> |
| **Timeline.** The same notes read back by day and by week, with whatever is coming up pulled to the top. | **Writing.** Write a line and watch it get read: the words echo took out of the sentence, and the notes it is already reminded of. |

---

## How it runs

| | |
| --- | --- |
| **Search keeps up with typing** | Full text is a GIN index over a stored `tsvector`, not a scan. Ten thousand notes answer a query in 21 ms, and related notes in 8 ms. Meaning arrives a moment behind the words and re-orders the answers rather than holding them up. |
| **Offline is the normal case** | The service worker is thirty lines and precaches nothing: the document is network first, so a stale shell can never pin you to an old build, and everything else is cache first because it is content addressed. Stop the server, reload, and the shell, the database and every note come back. |
| **Forgetting is real** | Learned rules are derived on read and never written down, so "forget this" is a delete rather than a flag that something else might still consult. |
| **The desktop build is the same code** | Tauri v2 around the same static export. The Rust side is a window and nothing else, and its capability file grants `core:default` and nothing more, because the database, the search and the learning all run in the web app on every host. |
| **The database is real Postgres** | PGlite in the browser now, the same migrations on a server later. Nothing outside `@echo/db` writes SQL. |

---

## Layout

```text
apps/www            Marketing site: its own Next app, its own tokens, its own deploy, no domain code
apps/web            Next.js application (PWA)
  app/              route entries and the components that own application state
  app/postit/       the desktop sticky note: its own window, its own owner, no database
  modules/          one folder per feature, each with its own _components
  shared/           components, helpers and the dictionary that more than one module needs
apps/desktop        Tauri shell around the same web build; no business logic in Rust
packages/types      Domain contracts (zod schemas, inferred types)
packages/core       Domain logic, services, event bus. No IO, no React
packages/db         Repositories and migrations (PGlite locally, Postgres on a server)
packages/parser     Deterministic content analysis: dates, tasks, keywords
packages/embeddings Local embedding runtime behind a swappable interface
packages/search     Lexical and semantic retrieval, hybrid ranking, destination suggestions
packages/learning   Learning events in, learned rules out
packages/sync       Sync protocol and conflict resolution
packages/ui         Shared UI primitives (promotion target; coss lives in apps/web for now)
packages/config     Shared runtime configuration
packages/test-utils Fixtures and test helpers
tooling/tsconfig    Shared TypeScript presets
```

A domain package never holds a sentence: `@echo/search` returns reason codes, and the interface owns the words.

---

## Documentation

| Document | What is covered |
| --- | --- |
| [docs/PLAN.md](docs/PLAN.md) | The phased implementation plan and its checkpoints |
| [docs/STATE.md](docs/STATE.md) | Where the build actually stands, every decision made, and the known gaps |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | The layering, and the boundary rules that hold it together |
| [docs/DESIGN.md](docs/DESIGN.md) | Visual direction: the two surfaces, tokens, type, shell anatomy, motion |
| [AGENTS.md](AGENTS.md) | The working contract for this repository, and the index of the ones below it |
| [apps/www/AGENTS.md](apps/www/AGENTS.md) | The marketing site: its sections, its generated imagery, and what keeps it separate from the app |

---

## Status

**Phase 6 is complete**, along with editor mode, the intelligence passes (S1 to S4), the writing surface and slash commands (E1 and E2), and the language and arrival work (P8a to P8e). Capture, search, related notes, nested folders, Inbox triage, tasks, settings, two languages and the desktop shell all work locally today.

**Phase 7 is sync**: a change-log protocol, a Postgres server running the same migrations, explicit conflict handling, and auth. It is the largest remaining chunk and it delivers nothing until it is finished, so it goes last, before polish.

Deliberately not built yet: projects as an entity of their own, a hosted demo, and CI. [docs/STATE.md](docs/STATE.md) keeps the honest list of gaps and debt, and it is the first thing to read before touching anything.

---

## A note on the web build

Development runs on Turbopack; production runs on webpack (`next build --webpack`). Turbopack miscompiles PGlite's runtime module, and the result is an app that loads and then cannot open its database, visible only in a built export and never in dev. `apps/web/next.config.ts` records the details.

PGlite's WebAssembly and the ONNX runtime are copied into `public/` before every build, so a deployment is a folder of files and nothing reaches for a CDN. Only the model weights are fetched on first use, once, and then cached by the browser.

---

## Contributing

```bash
git clone https://github.com/luannzin/echo.git
cd echo && bun install
bun run typecheck && bun run lint && bun run test
```

Read [AGENTS.md](AGENTS.md) first: it is the working contract for the repository, and every folder that has one of its own is indexed at the bottom of it. The short version: TypeScript only, arrow functions, one component per file, Biome decides formatting, schema changes go through `bun run --cwd packages/db db:generate`, and every word the interface says comes from `apps/web/shared/lib/i18n`.

---

## License

TBD, with permissive open source as the intent. See [docs/STATE.md](docs/STATE.md#open-decisions).
