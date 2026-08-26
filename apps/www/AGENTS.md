# apps/www

## Purpose

The marketing site: one static page that explains echo and hands the reader the commands to run it.
It is the loud half of the brand (`docs/DESIGN.md`) — electric blue field, oversized display serif,
mono micro-labels, dithered engravings. The application lives in `apps/web` and shares nothing with
this app at build time.

## Ownership

- Owns `app/**` (route, layout, tokens) and `components/**` (every section of the page).
- Owns its own token set in `app/globals.css`. It re-declares the brand values rather than importing
  the application's stylesheet, so a change to the app's chrome cannot repaint the site by accident.
- Does not own product truth: every claim on the page has to be something the app already does.

## Local Contracts

- Separate deploy from `apps/web`: `bun run dev:www` (port 3001), `bun run --cwd apps/www build`
  writes a static export to `out/`.
- No workspace dependencies. The site imports nothing from `@echo/*` — it has no database, no
  parser, and no reason to compile the domain.
- Imagery is generated, never a file: plates are drawn as greyscale SVG in `components/engraving.tsx`
  and printed through the filters in `components/filters.tsx`. Do not add an image asset without a
  reason no vector can meet.
- Filters take their colours from CSS custom properties through `flood-color`, so no filter, plate or
  component carries a hex value. `components/links.tsx` is the only place a URL is written down.
- Motion is scroll-driven CSS (`animation-timeline: view()`), not JavaScript. There is no scroll
  listener, no observer and no motion library on this page, and every animation sits inside
  `@media (prefers-reduced-motion: no-preference)`.
- One client component: `install-box.tsx`, because the clipboard and the tab state need one. Anything
  else stays a server component.
- Copy describes the product, never the build order — no phase numbers, no roadmap, no dead links.

## Work Guidance

- TypeScript only, arrow functions, one component per file, exported by name (root `AGENTS.md`).
- Text sitting on a plate has to be measured against the plate, not against the field behind it —
  the engravings are bright in places. Small text at 4.5:1, display type at 3:1.
- A section that scrolls sideways on a phone is a bug: grid and flex children that hold pre-formatted
  text need `min-w-0`, or the longest command sets the page width.

## Verification

```bash
bun run --cwd apps/www typecheck
bun run lint
bun run --cwd apps/www build
```

Then look at it: `bun run dev:www` and read the page at 1440px and at 390px.

## Child DOX Index

- No child AGENTS.md files. `app/` and `components/` are small enough to be governed from here.
