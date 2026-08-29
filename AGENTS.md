# echo

Open source, no-AI note taker that learns with you. Local-first: notes, search, organization and
learning all run on the user's machine, and no core feature may require an AI API key.

- Write the product name lowercase in prose, docs and UI copy: `echo`
- Package scope is `@echo/*`
- Product copy describes the product, never the build order — no phase numbers in the UI
- Roadmap lives in `docs/PLAN.md`, current state in `docs/STATE.md`, boundaries in
  `docs/ARCHITECTURE.md`, visual system in `docs/DESIGN.md`

# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

- Work in phases with checkpoints; update `docs/STATE.md` at the end of every phase
- Stack is fixed: bun workspaces, Turborepo, Biome, Next.js, Tailwind, coss ui, Drizzle + PGlite
- Tests run on `bun test`; no separate test-runner dependency
- Schema changes go through `bun run --cwd packages/db db:generate` — never hand-edit generated SQL
  or `src/migrations.generated.ts`
- coss registry files are CLI-owned — compose, never hand-edit: `apps/web/components/ui/**`,
  `apps/web/hooks/**`, `apps/web/lib/utils.ts`, `apps/web/lib/segmented-control.ts`
- Keep UI state plain: no React context, no custom hooks, no state library unless prop passing has
  actually broken down. One owner component, props downward
- Every pointer-only affordance needs a keyboard twin: drag and drop is paired with a context menu,
  a hover-revealed control stays reachable on focus
- Responsive behaviour is CSS, not a second component tree: one list in the document, and no guess
  about the viewport before the browser has said what it is
- Every word the interface says comes from `apps/web/shared/lib/i18n`, read at render through
  `copy()`. **Never lift it into a module-level constant** — `const words = copy().rail` at the top
  of a file captures whichever dictionary was active when the module was first evaluated and never
  changes again. Inside a component body is fine; the component re-renders.
- `en.ts` is the specification and `pt.ts` is annotated against it, so `bun run typecheck` is the
  translation completeness check. A value that varies is a function returning the **finished
  sentence**: Portuguese reorders what English concatenates, so a sentence assembled at the call
  site is a sentence no language can move
- Key legends (`Enter`, `Esc`, `Tab`, `Ctrl`, `⌘`) are printed on the hardware, not copy. They stay
  literals
- Domain packages never hold a sentence. `@echo/search` returns reason codes; the interface owns the
  words
- Preferences live in `apps/web/shared/lib/preferences.ts` under `echo:` keys, named as Phase 7's
  `user_preferences` table will name them. The language is the exception and belongs to `i18n`,
  because the dictionary has to be pointed somewhere before anything can read a word of copy

## apps/web layout

```text
app/                     route entries and their owner components, plus the command list
app/postit/              the desktop sticky note: its own window, its own owner, no database
shared/lib/i18n/         en.ts is the specification, pt.ts is checked against it, copy() reads it
modules/<module>/
  _components/*.tsx      one component per file, exported by name
  *.ts                   that module's own types and pure helpers
shared/
  _components/*.tsx      anything two modules render
  lib/*.ts               anything two modules import
components/ui, hooks, lib/utils.ts, lib/segmented-control.ts   coss registry, CLI-owned
```

Modules today: `capture`, `editor`, `explorer`, `inbox`, `intelligence`, `notes`, `onboarding`,
`search`, `settings`, `shell`, `tasks`, `timeline`.
A module never reaches into another module's `_components`; anything two of them need moves to
`shared/`.

`apps/desktop` is a Tauri shell around `apps/web/out`. No business logic in Rust — the domain runs
in the web app on every host, including the tools its MCP server offers to an assistant. Its rules
live in `apps/desktop/AGENTS.md`.

`apps/www` is the marketing site: its own Next app, its own tokens, no `@echo/*` dependency, and its
own deploy. Its rules live in `apps/www/AGENTS.md`.

## Code style

- TypeScript only, `.ts` / `.tsx`
- Arrow functions everywhere, including components and default exports
- One component per file. Nothing is declared inside another component, and nothing is defined
  inline that a name would explain better
- Comments earn their place: a decision that is not obvious from the code, a measured number, a
  browser quirk, or a `ponytail:` ceiling. Nothing that restates the line below it

## Child DOX Index

- `apps/desktop/AGENTS.md` — the Tauri shell: what may live in Rust, and the MCP server that lets an
  assistant reach echo without either half learning the other's job.
- `apps/www/AGENTS.md` — the marketing site: its sections, its generated imagery, and the rules that
  keep it separate from the application.
- Root-owned files: `LICENSE`, `README.md` and `README.pt-BR.md`, `assets/**` (the README's banner,
  hand-written SVG with no filters because GitHub strips them), `docs/**`, and root-level tooling
  config (`package.json`, `turbo.json`, `biome.json`, `tooling/**`).
- **The two READMEs are one document in two languages**, and each one links to the other on its
  first lines. A change to either has to land in both in the same commit — a Portuguese README that
  is three features behind is worse than no Portuguese README. The screenshots are the ones
  `apps/www` owns, referenced in place rather than copied, so a re-capture updates both.
- **`assets/reel.webp` is the one derived asset, and GitHub is the reason.** GitHub serves `raw`
  video with `Content-Disposition: attachment`, so a `<video>` tag pointing at the mp4 downloads the
  file instead of playing it — and `<video>` fallback content never renders when it is only the
  *source* that failed, so the reader gets an empty block and no link. An animated WebP is an
  ordinary `<img>`: it plays inline, it degrades to its own first frame rather than to nothing, and
  at 1280px it is a tenth of the equivalent GIF. Re-encode it from `apps/www/public/reel/echo.mp4`
  whenever the reel is re-captured; it links to the blob view, which does play the full 2560x1440.
- **The application icon is generated, not drawn by hand.** `scripts/icons.mjs` prints the `orb`
  plate from `apps/www/components/engraving.tsx` on the brand field through the site's own Bayer
  dither, and writes every size both applications ship: `apps/web/app/icon.png` and `apple-icon.png`,
  the three in `apps/web/public`, the four PNGs and the `.ico` in `apps/desktop/src-tauri/icons`,
  and `apps/www/app/icon.svg`. Re-run it after changing the plate, the brand colour or the set;
  never edit an icon by hand, because the next run overwrites it. It needs `bunx playwright install
  chromium` and is deliberately not a workspace dependency.
- Sizes at or over 128px are dithered and sizes at or under 64px are flat. That split is arithmetic,
  not taste: the screen is an 8x8 tile and one Bayer cell cannot be smaller than one pixel, so a
  32px dithered orb is noise. Small sizes get the silhouette instead.
- **MIT, and every package says so.** `LICENSE` at the root is the text; `"license": "MIT"` is set in
  all sixteen `package.json` files and in `src-tauri/Cargo.toml`, because a workspace where only the
  root declares it is a workspace whose published metadata disagrees with itself. A new package
  copies the field along with the rest of its manifest.
- The prose docs (`docs/**`, every `AGENTS.md`) stay English-only: they describe code and contracts,
  and a translated contract is a second contract to keep true. The READMEs are the exception because
  they are the front door.