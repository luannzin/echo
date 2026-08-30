# apps/www

## Purpose

The marketing site: one static page that **shows echo working** and hands the reader the commands to
run it. It is the loud half of the brand (`docs/DESIGN.md`): electric blue field, display serif,
mono micro-labels, dithered engravings. The application lives in `apps/web` and shares nothing with
this app at build time.

The page argues by showing the application rather than by describing it: a 2K screen recording under
the hero, and a captured screen beside every claim — the palette taking a question apart, the Inbox
naming the notes that argued for a destination, a note arriving with its neighbours, and two of the
reader's own words turning out to be one word. A claim without a screen under it does not get a
section.

## Ownership

- Owns `app/**` (the two roots and the tokens), `components/**` (every section of the page, plus the
  shared `cta.tsx` and `language-link.tsx`) and `content/**` (everything the page says, in both
  languages). Owns `public/shots/**` and `public/reel/**`: the captures of the running application.
- Does **not** own `app/favicon.ico`. It is written by `scripts/icons.mjs` and is the same file the
  desktop application bundles, so a tab and a taskbar show one icon rather than two drawings of it.
  Root `AGENTS.md` has the rules; editing it by hand is overwritten by the next run.
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
- **Two documents, not one that switches.** There is no `app/layout.tsx`: `app/(en)/` and
  `app/(pt)/` are route groups with nothing above them, which is Next's multiple-root-layouts
  arrangement and the only way each document declares its own `<html lang>` in a static export. A
  dynamic `[lang]` segment would need a redirect at `/`, and a static export cannot serve one.
  English keeps `/` so every existing link resolves; Portuguese is `/pt-br`.
- **Content is data, handed down as props.** `content/en.ts` is the specification and `content/pt.ts`
  is annotated against it, so `bun run --cwd apps/www typecheck` is the translation completeness
  check. Unlike the application's dictionary these values may not be functions: the content reaches
  `install-box.tsx`, which is a client component, and a function cannot cross that boundary.
  `components/page.tsx` renders the page once for whichever content it was given.
- **The mechanics are translated; the corpus is not.** Chips, counts, reason sentences and the alt
  text describing a screen all move with the language. The note titles and project names inside the
  screenshots do not: a working programmer's notebook in Brazil has the same English library names
  in it, and translating them would make the demonstrations read as staged.
- **No automatic redirect.** A visitor is offered the other language by a link in the nav and again
  in the footer, written in the language it leads to. Sending someone whose browser says `pt` to
  `/pt-br` would break the back button, split the crawl, and take the choice away from the many
  Brazilians who read documentation in English on purpose. Both documents emit `hreflang` for each
  other and `x-default` for the root.
- Separate deploy from `apps/web`: `bun run dev:www` (port 3001), `bun run --cwd apps/www build`
  writes a static export to `out/` (`index.html` and `pt-br.html`).
- No workspace dependencies. The site imports nothing from `@echo/*`, so it has no database, no
  parser, and no reason to compile the domain.
- **The ground is drawn; the product is captured.** Plates are greyscale SVG in
  `components/engraving.tsx`, printed through the filters in `components/filters.tsx` — do not add a
  decorative image asset a vector could have drawn. The screens are the exception and the reason the
  rule has one: the Inbox arguing for a folder is worth more as the thing itself than as a drawing
  of it, and a drawing is where a claim quietly stops being true. `public/shots/*.webp` and
  `public/reel/*` are captures of `apps/web` running against a real corpus, never mockups.
- The `cup` plate is the one engraving that draws an object rather than a pattern, and it is still a
  plate: greyscale line work over a gradient, printed through the same dither. It is drawn rather
  than imported as a coffee glyph so it holds at any density and takes its two colours from the
  theme. An icon set would have broken both rules at once.
- **Every capture is of the app as it actually is.** Re-take them when the interface moves; a
  screenshot of a build that no longer exists is a lie with a timestamp.
  The reel is 2560x1440 so it is sharp on the monitors this page is read on, 16:9 so `.reel-video`
  crops nothing, and about thirty seconds — long enough for one note to be written, searched for and
  filed, short enough to loop without becoming furniture.
- **Every file in `public/shots` is cut to 2290x1760**, because `components/shot.tsx` writes those
  numbers down once for all of them rather than taking them per shot. A file at another ratio is not
  a smaller mistake than a wrong `width` attribute — it is the same one, and it makes the browser
  reserve a box the wrong height and the page jump under the reader. So crop to the ratio before
  adding a capture, and crop rather than letterbox: `native.webp` came off a 2559x1398 screen and is
  the middle 1810 columns of it, chosen to clear the sidebar's empty states on one edge and a
  half-cut button on the other.
- **The mechanics are the running app's; the corpus is illustration.** Whatever the captures show —
  counts, chips, reason sentences — is whatever the application produced, never a number typed in
  afterwards. The note titles and project names around them are an ordinary working programmer's
  corpus, deliberately not the author's own projects, so a visitor reads their own notebook rather
  than someone else's. `alt` text describes what is in the file and inherits that honesty: if it
  names a count, the count has to be on screen.
- Filters take their colours from CSS custom properties through `flood-color`, so no filter, plate or
  component carries a hex value. `components/links.tsx` is the only place a URL is written down:
  `SITE` (`useecho.dev`, what the canonical tags resolve against), `APP` (`app.useecho.dev`, the
  hosted build), `REPO` and `COFFEE`.
- **The primary action is opening the app, everywhere it appears.** The nav button, the hero's first
  button and the footer's first button all go to `APP`; running it yourself is offered one step
  quieter, and reading the source lives in the nav and the footer rather than in the hero. Before
  the app was hosted every path on this page ended at `git clone`, which only a reader who is
  already sold will complete — that was the largest conversion loss on the site and it was a deploy,
  not a design.
- **The support section asks once, and late.** `components/support.tsx` sits after the facts band and
  before the closing line, because a reader who has not yet seen the product work has nothing to
  thank anyone for. It names the exchange rather than appealing — there is no paid tier, so this is
  the only way to give anything back — and it asks for one coffee rather than an open-ended amount.
  No banner, no sticky bar, no second ask: the footer carries a quiet repeat and that is all.
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
  the clipboard and the tab state need one, and `reel-player.tsx`, because whether the reel may play
  at all is a question about the visitor's machine. Everything else stays a server component, the
  language switcher included: it is a link.
- **The reel is ambient; the demo is the dialog.** `.reel-frame` fades the recording out at the foot
  so it becomes the spectrum rather than ending on a line, which is exactly what makes the bottom of
  it unreadable — so the frame carries a centred **Play demo** button that opens the same file in a
  near-fullscreen `<dialog>`, opaque and unmasked, with the browser's own controls. Native
  `showModal()`, never a hand-built overlay: the focus trap, the return of focus, Escape and
  `::backdrop` all come from the platform. The small Play/Pause at the head stays — it is the motion
  switch that autoplaying content owes the reader, and it is a different question from "let me watch
  this".
- **Portuguese is written first, and English follows it.** `content/en.ts` is still the *shape* every
  language is checked against, but it is not where the words are decided. Writing English first is
  what produced the paragraphs this page used to carry: `.label` is mono, uppercase and tracked at
  `0.18em`, Portuguese runs twenty to thirty percent longer, and a sentence that only fits in English
  is a sentence the other document has to wrap into three lines of tracked capitals. A shorter true
  sentence beats a faithful one. Measured: nothing on either document scrolls sideways at 390px, and
  the hero's eyebrow takes the same two lines there in both languages.
- **Two sentences per claim.** Every `body` and `subtitle` says what the thing does and what the
  reader gets, and stops. The third sentence is always the one defending a point the first two have
  already made, and it is where readers leave. Titles carry no metaphor that has to survive
  translation — "duas perguntas vestindo um casaco só" only ever worked in English.
- One definition per repeated control: `components/cta.tsx` is the hero's and the footer's shared
  call to action in three tones, and `components/language-link.tsx` is the other-language link at
  both ends of the page. The language's `hreflang` comes from `content.other.lang`, never from
  comparing its display label.
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

`typecheck` is also the translation check: a key added to `content/en.ts` and not answered in
`content/pt.ts` does not compile.

Then look at it: `bun run dev:www` and read **both** documents (`/` and `/pt-br`) at 1440px and at
390px.

## Child DOX Index

- No child AGENTS.md files. `app/` and `components/` are small enough to be governed from here.
