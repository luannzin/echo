# apps/www

## Purpose

The marketing site: one static page that **shows echo working** and hands the reader the commands to
run it. It is the loud half of the brand (`docs/DESIGN.md`): electric blue field, display serif,
mono micro-labels, dithered engravings. The application lives in `apps/web` and shares nothing with
this app at build time.

The page argues in four demonstrations rather than in feature cards: the composer parsing a note as
it is written, the palette taking a question apart, two of the reader's own words turning out to be
one word, and the Inbox naming the notes that argued for a destination. A claim without a screen
under it does not get a section.

## Ownership

- Owns `app/**` (route, layout, tokens) and `components/**` (every section of the page).
- Owns its own token set in `app/globals.css`. It re-declares the brand values rather than importing
  the application's stylesheet, so a change to the app's chrome cannot repaint the site by accident.
- Does not own product truth: every claim on the page has to be something the app already does.

## Local Contracts

- **One measure, one gutter, one edge.** `.shell` in `app/globals.css` owns every horizontal edge on
  the page: max-width 1400px, gutter inside the measure, `padding-inline` with `env(safe-area-inset)`.
  Sections carry vertical rhythm and background only. Putting the gutter on the section instead is
  what gave this page ten different leading edges at 1440px, because a section already at its max
  width starts its text at the viewport gutter while one that is not starts a gutter further in. A
  band that wants to bleed (the paper one in `facts.tsx`) puts the colour on the section and a
  `.shell` inside it, so the tone changes and the alignment does not. Measured: one leading edge at
  every viewport (53px at 1440, 40px at 768, 24px at 375).
- Separate deploy from `apps/web`: `bun run dev:www` (port 3001), `bun run --cwd apps/www build`
  writes a static export to `out/`.
- No workspace dependencies. The site imports nothing from `@echo/*`, so it has no database, no
  parser, and no reason to compile the domain.
- Imagery is generated, never a file: plates are drawn as greyscale SVG in `components/engraving.tsx`
  and printed through the filters in `components/filters.tsx`. Do not add an image asset without a
  reason no vector can meet. The plates are ground now, not subject. The demos are.
- **Demos are the application, not a picture of it.** `components/*-demo.tsx` are real markup inside
  `components/panel.tsx`, painted with the app's own tokens (`carbon`, `carbon-lift`, `quiet`,
  `faint`, `brand-lit`), so they stay sharp at any density and repaint with the theme. Never a
  screenshot. **The mechanics are the running app's; the corpus is illustration.** Counts, chips,
  reason sentences and learned sentences keep the exact shape and wording the app produced in the
  S1–S4 verification notes in `docs/STATE.md`: `16 set aside`, `File 13`, `you usually put x and y
  notes there`, `“a” and “b” are the same thing`. The note titles and project names around them are
  an ordinary working programmer's corpus, deliberately not the author's own projects, so a visitor
  reads their own notebook rather than someone else's. Changing a shape is inventing a feature;
  changing a note title is not.
- Filters take their colours from CSS custom properties through `flood-color`, so no filter, plate or
  component carries a hex value. `components/links.tsx` is the only place a URL is written down.
- Motion is CSS, not JavaScript. There is no scroll listener, no observer and no motion library on
  this page, and all of it sits inside `@media (prefers-reduced-motion: no-preference)`. Two kinds:
  - **Below the fold, scroll-driven** (`animation-timeline: view()`): `.parallax`, `.reveal`,
    `.drift`, and the `.cue` / `.cue-keys` pair that assembles a demo as it is scrolled to. A
    browser without view timelines gets the finished state, which is the design either way.
  - **The hero, clock-driven** (`.beat`, `.keys`): a view() timeline is already finished before
    anyone looks above the fold, so the hero is choreographed against time instead. Written as
    transitions out of `@starting-style`, never as keyframes with a backwards fill, because **the declared
    state has to be the finished one.** A keyframe holding its `from` state through a delay leaves
    the hero blank wherever timelines do not advance: a background tab, a print, a headless
    renderer. Same rule for any reveal added later.
- A reveal holds its own content and uncovers it (`clip-path`), so nothing on the page is gated on
  an animation having run. `@media print` at the foot of the components layer settles every one of
  them, and it wins by being declared last rather than by `!important`.
- Two client components, and no more without a reason of the same weight: `install-box.tsx`, because
  the clipboard and the tab state need one, and `composer-demo.tsx`, because the hero's composer is a
  box a visitor can actually write in. Everything else stays a server component.
- **The hero composer is real.** It answers what is typed into it (word count, the task phrase that
  gave it away, the day it found) through `components/note-signals.ts`, a small deterministic
  stand-in for `@echo/parser` (the site has no workspace dependencies, so it cannot use the real
  one). Keep that ruleset short: a composer that finds a task in every sentence is the bug the real
  threshold exists to prevent. Nothing typed there is stored, sent or lifted into page state.
- Copy describes the product, never the build order: no phase numbers, no roadmap, no dead links.

## Work Guidance

- TypeScript only, arrow functions, one component per file, exported by name (root `AGENTS.md`).
- **`label` is for one to three words.** Mono, uppercase and tracked at 0.18em is a specification for
  a label, and it comes apart into letters the moment it carries a sentence. Body copy is
  sentence-case sans through `prose-lede` and `prose-body`, which cap the measure at 46ch and 62ch.
  Six paragraphs of 11px tracked capitals is what this page used to be; do not put them back.
- Text sitting on a plate has to be measured against the plate, not against the field behind it,
  because the engravings are bright in places. Small text at 4.5:1, display type at 3:1. Measured on the
  running page, the lowest ratio anywhere is 4.69:1 at 11px; treat that as the floor to hold.
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
