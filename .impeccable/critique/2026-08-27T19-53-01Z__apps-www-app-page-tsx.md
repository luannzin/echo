---
target: apps/www landing page (tour section focus)
total_score: 28
p0_count: 3
p1_count: 3
timestamp: 2026-08-27T19-53-01Z
slug: apps-www-app-page-tsx
---
⚠️ DEGRADED: single-context (session policy forbids spawning sub-agents unless the user asks)

Target: `apps/www` landing page, weighted to `components/tour.tsx` + the `.tour-*` block in
`app/globals.css`. Read on the running dev server (localhost:3001) at 1440×900, 834×1000 and 390×844.
Screenshots unavailable (Browser pane not displayed); every number below is measured from computed
styles, `getBoundingClientRect`, decoded image headers and the DOM — not eyeballed.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Four shots declare a 1.64 aspect and are 1.30 — every image on the page reserves the wrong box and jumps when it lands. The tour signals "which of four" with opacity alone. |
| 2 | Match System / Real World | 3 | Copy is much stronger than the last pass — "notes about caching in payments", "You type k8s". "The rest of it" is still private idiom. |
| 3 | User Control and Freedom | 3 | Anchors work, the reel pauses, the radio group has arrow keys. Nothing traps. |
| 4 | Consistency and Standards | 3 | One measure, one gutter, one token set — genuinely disciplined. Undercut by `Shot` being wrong about its own pixels in three different ways. |
| 5 | Error Prevention | 3 | Clipboard refusal is caught and named. Requirements sit above the commands that need them. |
| 6 | Recognition Rather Than Recall | 3 | The prior P0 (product never shown) is fixed: 8 real screens + a reel. Docked because the tour transforms four of those eight past legibility. |
| 7 | Flexibility and Efficiency | 2 | Still clone-and-run only. No hosted demo, no binary, no `npx`. |
| 8 | Aesthetic and Minimalist Design | 3 | The dither engine, the spectrum band and the token discipline are real craft. Docked for a decorative transform on evidence, and one identical entrance applied 11 times. |
| 9 | Error Recovery | 3 | The clipboard message is specific and tells the reader what to do instead. |
| 10 | Help and Documentation | 3 | Docs linked from several places; prerequisites spelled out. |
| **Total** | | **28/40** | **Good — solid foundation, the tour is the weak section** |

## Anti-Patterns Verdict

**Deterministic scan**: `detect.mjs --json apps/www/app apps/www/components` returned `[]`, exit 0.
As last time this is a **false negative rather than a clean bill** — the detector resolves HTML/CSS,
and this page expresses nearly everything through Tailwind `@utility` classes applied in JSX. It
cannot see `border-inline-start: 2px` on `.tour-point`, which is on the absolute-ban list.

**LLM assessment**: the page does not read as AI-generated, and that has improved since the last
critique. The dither engine (`filters.tsx`) is a real 8×8 Bayer threshold chain in SVG, the plates are
generated from loops rather than dropped in as assets, and the spectrum band is five masked radial
gradients rather than a blur. Nothing in that family comes out of a template.

Two tells survive, both in the tour:

1. **Side-stripe border** (absolute ban). `.tour-point { border-inline-start: 2px solid transparent }`
   going solid `--color-ink` on the checked point. The ban text is exact: "`border-left` greater than
   1px as a colored accent on cards, list items, callouts". This is the list-item case.
2. **The uniform entrance reflex.** 11 elements carry `.reveal`, all with the identical 28px fade-up
   over the identical `entry 5% cover 26%` range: 4 feature articles, the tour header, the install
   column, 4 fact rows. Features' four articles sit in a 2-column grid and all fade the same way with
   no stagger. Meanwhile the tour's four points and its stage — the only interactive thing on the page
   — get **no** entrance motion at all. The motion budget is spent on the static half.

**Visual overlays**: not available. The Browser pane is not displayed, so no screenshot or injected
overlay could be produced. All findings come from measurement instead.

## Overall Impression

The page is now doing the job the last critique said it wasn't: the product is on screen. The reel,
the four feature shots and the tour are the fix, and the score moved 23 → 28 almost entirely on that.

The tour is where the new work is weakest, and it is weakest in a specific and fixable way: **it
treats evidence as texture.** A screenshot is on stage to prove a claim. This one is rotated 5°,
sheared -10°, scaled to 75%, and dissolved at two of its four edges. At 1440 the image box is 785px
wide holding a 2290px capture, which puts the app's 12px interface type at roughly 4 device pixels.
Nobody can read it. The section's own heading promises "everything you write, kept four ways" and then
shows four blurs of the same dark rectangle.

The single biggest opportunity: make the stage legible and make the swap mean something. Right now
pressing a point crossfades two identically-shaped, identically-transformed dark rectangles over 320ms.
There is no spatial relationship between the thing pressed and the thing that changed, and no direction
of travel — going Tasks → Timeline feels the same as going back. That is a dissolve, not a transition.

## What's Working

1. **The radio group is the right control, for the right reason.** Using `input[type=radio]` + `:checked`
   instead of buttons + state means arrow keys, the focus ring, the group name a screen reader announces
   and the no-JS fallback all come free rather than being re-implemented. The first point is
   `defaultChecked` in markup, so a reader with no CSS gets four captioned screenshots instead of an
   empty stage. `visibility: hidden` rather than opacity alone keeps the three off-stage panels out of
   the accessibility tree. That is a genuinely well-reasoned piece of engineering, and it should survive
   any redesign of the visuals on top of it.
2. **`.shell` as the single owner of every horizontal edge.** Sections carry vertical rhythm and colour
   only; the gutter lives inside the measure. Measured, the leading edge is 53px at 1440, 40px at 834,
   24px at 390 — one edge at every width, including across the paper-coloured Facts band that bleeds
   full width. Most pages this size have five leading edges.
3. **Alt text that is actually part of the voice.** "The task list: five open tasks, the ones with a
   date grouped under Due and the rest under No date, each showing the note it came out of." That is
   the screenshot described to someone who cannot see it, not `alt="tasks"`.

## Priority Issues

### [P0] Three of the four tour points fail contrast, and break the project's own stated floor

`.tour-point` sets `opacity: 0.62` on the unchecked points; the description inside already sits at
`text-ink/80`. Measured against the blue field on the running page:

| | size | measured | needs |
|---|---|---|---|
| Active title | 27.4px | 7.65:1 | 3:1 ✅ |
| Active description | 15.5px | 5.16:1 | 4.5:1 ✅ |
| **Inactive title ×3** | 27.4px | **3.47:1** | 3:1 — scrapes by |
| **Inactive description ×3** | 15.5px | **2.57:1** | 4.5:1 ❌ **fails AA** |

`apps/www/AGENTS.md` sets the project's own floor explicitly: *"the lowest ratio anywhere is 4.69:1 at
11px; treat that as the floor to hold."* The inactive descriptions land at 2.57:1 — a little over half
of it. Three quarters of the section's prose is below AA, and it is the prose that explains what the
four screens are.

**Why it matters**: the de-emphasis is doing double duty as "not selected" *and* "not readable". A
reader deciding which point to press has to read the three they haven't pressed.

**Fix**: stop using group `opacity` to express selection. Hold the description at a fixed readable
tone (`text-ink/80`, ~5.2:1) for all four and carry selected/unselected with something that isn't
luminance — a background wash on the active row, a leading rule that has weight rather than colour, a
size or weight shift on the title. Keep at most a 1.0 / 0.82 split on the *title* if a tonal cue is
still wanted; never take the body copy below 4.5:1.

**Suggested command**: `/impeccable colorize`

### [P0] Every `width`/`height` on the page is wrong — every image causes layout shift

Decoded from the file headers, all eight shots in `public/shots/` are **2290 × 1760** (aspect 1.301).
The markup declares:

| file | declared | real | declared aspect | real aspect |
|---|---|---|---|---|
| stream, tasks, timeline, write, inbox, note | 2880 × 1760 | 2290 × 1760 | 1.636 | 1.301 |
| search | 1264 × 762 | 2290 × 1760 | 1.659 | 1.301 |
| meaning | 1264 × 952 | 2290 × 1760 | 1.328 | 1.301 |

`shot.tsx`'s own doc comment says the opposite is true: *"`width` and `height` are the file's own
pixels, so the browser holds the space before the image lands and the page does not jump under the
reader. All eight are cropped to one geometry."* They are cropped to one geometry — just not the one
written down. The browser reserves a box 26% too short for six of the eight and then re-lays out when
the file arrives.

**Why it matters**: this is textbook CLS, on eight images, on the one page whose job is a first
impression. It also silently defeats the reason the attributes were added.

**Fix**: set every `Shot` to `width={2290} height={1760}`, or drop the per-shot numbers and put
`aspect-ratio: 2290 / 1760` on `.shot > img` in one place so it cannot drift again.

**Suggested command**: `/impeccable audit`

### [P0] Below 1024px the tour's premise disappears

The grid is `lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]`, so at ≤1023px it collapses to one
column and the stage stacks *under all four points*. Measured:

- **390px**: points occupy y 882 → 1407. The stage sits at y 1448. Pressing a point at the top changes
  an image roughly a full viewport below it, off screen. The reader has no way to learn the two are
  connected. The image is 307px wide holding a 2290px capture, at 75% scale, rotated, sheared and
  faded — it is a smudge.
- **834px**: same stack, and the transformed image lands at **x = −18**, 18px past the left edge of the
  viewport and 58px past the shell gutter. `overflow-x: clip` on `body` hides the scrollbar, so the
  screenshot is silently cropped rather than visibly broken.

**Why it matters**: "press a point, the thing beside it swaps" has no *beside* on a phone or a tablet.
That is most of a landing page's traffic, and it is the section's entire reason for existing.

**Fix**: below `lg`, stop pretending. Either (a) put the stage directly under the *active* point —
one image that moves down the list as the selection changes, so the relationship stays visible; or
(b) drop the tabs and lay the four out as four captioned screens in sequence, which is what the
no-CSS fallback already is. Option (a) keeps the interaction; option (b) is the smaller diff and
is honest about a phone having no room for a two-pane control.

**Suggested command**: `/impeccable adapt`

### [P1] The transform stack destroys the evidence it exists to present

`rotate-[5deg] scale-75 skew-x-[-10deg]` with `origin-top-right`, plus
`mask-image: linear-gradient(to bottom, black 60%, transparent) , linear-gradient(to left, black 70%, transparent)`
composited to `intersect` — so the lower 40% and the left 30% dissolve away.

Three separate problems stacked:

1. **Legibility.** 785px box, 2290px source, then ×0.75. The app's 12px chrome renders around 4px.
   Nothing in the screenshot can be read, which means none of the four claims is actually shown.
2. **`skew-x` is not perspective.** A shear leans the vertical strokes and leaves the horizontals
   flat. Real depth is `perspective(1200px) rotateY(-12deg)`, which converges the verticals and
   foreshortens one side. The current transform reads as "this image is broken", not "this screen is
   sitting in space". It is the single cheapest fix in this list.
3. **The mask eats the wrong third.** Fading bottom *and* left removes the sidebar and the composer —
   which for "The stream" and "Writing" is exactly the part the caption is pointing at.

**Why it matters**: the whole section is the answer to the previous critique's "the product is
described and never shown". Showing it illegibly is the same failure wearing a picture.

**Fix**: give the stage the room. Drop `scale-75` entirely, swap `skew-x` for a real
`perspective()/rotateY()` at a smaller angle (≤8°), reduce the mask to one edge and no more than the
last 20%, and consider cropping the source to the region each caption talks about rather than showing
the whole app four times.

**Suggested command**: `/impeccable bolder`

### [P1] Nothing on the section says it is interactive

There is no hover state on the stage, no numbering, no chevron, no progress indicator, no auto-advance.
`cursor: pointer` and a 0.62/1.0 opacity split are the entire affordance, and the opacity split reads
as "the first one is emphasised", not "these four are tabs". The stage never moves on its own, so a
reader who does not press has no evidence that pressing does anything.

**Why it matters**: a first-time visitor reads four paragraphs, sees one blurred screenshot, and
scrolls past. The section's cost — four 100KB+ images, a fifth of the page height — buys nothing.

**Fix**: give the active row real presence (a filled ground, not a stripe), give the points a hover
that moves something, and let the stage advance once on its own the first time it enters the viewport
so the mechanism demonstrates itself. Gate the auto-advance behind `prefers-reduced-motion` and stop
it permanently on first interaction.

**Suggested command**: `/impeccable animate`

### [P1] AGENTS.md now contradicts the code it governs

`apps/www/AGENTS.md` is the contract for this app, and five of its Local Contracts describe a version
of the page that no longer exists:

- *"Imagery is generated, never a file… Do not add an image asset without a reason no vector can meet."* — `public/shots/` holds 852KB of WebP.
- *"Demos are the application, not a picture of it. `components/*-demo.tsx`… Never a screenshot."* — there are no `*-demo.tsx` files; every demo is a screenshot.
- *"Two client components: `install-box.tsx` and `composer-demo.tsx`."* — the two are `install-box.tsx` and `reel-player.tsx`; `composer-demo.tsx` and `note-signals.ts` are gone.
- *"The hero composer is real."* — the hero has no composer.
- *"A reveal holds its own content and uncovers it (`clip-path`)"* and *"the `.cue` / `.cue-keys` pair"* — reveals use `opacity`/`translate`; there is no `.cue` in `globals.css`.

**Why it matters**: the next person (or agent) to touch this app will follow the document and either
undo the screenshots or add a demo component that no longer has a home.

**Fix**: rewrite those bullets to describe screenshots-as-evidence, and keep the reasoning — the
argument for why a shot beats a drawing is already written in `shot.tsx`'s header comment and belongs
in AGENTS.md.

**Suggested command**: `/impeccable document`

## Minor Observations

- **517KB loads for one visible image.** All four `.tour-panel`s are `visibility: hidden`, not
  `display: none`, so all four stay in layout and all four `loading="lazy"` images fetch when the
  section scrolls into view: 110 + 129 + 193 + 85 KB to show one. The active shot should be eager /
  `fetchpriority="high"` and the other three genuinely deferred.
- **The swap is a dissolve, not a transition.** Both panels occupy the same grid area with the same
  transform and the same mask, so a 320ms opacity crossfade blends two near-identical dark rectangles.
  Emil's rule applies exactly: during a crossfade you see two distinct objects overlapping. Either
  give the incoming panel a small directional offset and a `filter: blur(3px)` that resolves, or
  animate a `clip-path` wipe in the direction of travel.
- **Four subtitles, one grammatical shape, no verbs.** All four are a noun phrase plus a trailing
  "with X" clause: "…in the order you wrote it, **with** the box still on screen" / "…in ordinary
  sentences, **with** the dates those sentences mentioned" / "…by day and by week, **with** what is
  coming pulled to the top". Read as a set the rhythm becomes a tic, and none of them says what the
  screen *does*.
- **Two eyebrows on five sections.** "The rest of it" and "What it does with what you wrote". Not the
  every-section AI scaffold, but "The rest of it" is doing no work — it is a filler kicker over a
  heading that already says what the section is.
- **Focus ring lands on the label, not the row.** `outline` on `.tour-point` draws around the block
  including the 2px inline-start border, which at `ps-5` sits 20px from the text. Correct behaviour;
  worth re-checking after the stripe is removed.
- `Instrument Serif` is on impeccable's reflex-reject font list. It is the committed brand face here
  (`docs/DESIGN.md`), so identity-preservation wins — noting it only so it is a decision rather than
  an oversight.

## Persona Red Flags

**Jordan (first-timer)** — Reaches the tour after the reel and four feature blocks. Reads "Everything
you write, kept four ways", then four paragraphs at 2.57:1 that are hard to read and never name a
verb. Sees one dark rectangle, tilted and faded, whose contents are 4px tall. Nothing indicates the
four headings are pressable. Scrolls past the whole section having learned nothing, and the page has
now spent 517KB and a fifth of its height to say something it already said in the reel.

**Casey (phone, one-handed, interrupted)** — At 390px the four points run 525px tall; the image is
another 216px, 40px further down. Casey taps "Timeline" and nothing visibly happens — the thing that
changed is a full screen below the thumb. The image that eventually arrives is 307px wide holding a
2290px capture with the bottom 40% and the left 30% faded out. Also eats 517KB of WebP on a mobile
connection to render one unreadable picture. This is the persona the section fails hardest.

**Riley (stress tester)** — Loads with a slow connection and watches the page jump: six images reserve
a 1.636 box and resolve to 1.301. Turns on `prefers-reduced-motion` and finds the tour honest (the
crossfade is correctly suppressed). Prints the page and finds the print stylesheet genuinely correct —
all four panels un-stack and the masks come off. Resizes to 834px and finds the stage clipped 18px off
the left edge with no scrollbar to reveal it. Tabs into the radio group and finds arrow keys work,
which is more than most hand-rolled tab strips manage.

## Questions to Consider

- What if the stage were the section and the four points were the caption? Right now 40% of the width
  goes to prose that de-emphasises three quarters of itself, and 60% goes to an image nobody can read.
- Does this section need four screens, or does it need one screen shown properly? The reel above it
  already showed the app moving. If the tour's job is "there is more than one view of the same pile",
  that is one sentence and one well-chosen screenshot.
- What would this look like if the swap moved rather than dissolved — the four screens on a track, the
  selection sliding between them? The four screens *are* four views of one thing; a dissolve says they
  are alternatives, a slide says they are neighbours.
- The `skew-x(-10deg)` is the only sheared thing on a page whose entire visual identity is a printing
  press: engraved plates, ordered dither, halftone rosettes. What would the stage look like if it were
  printed rather than tilted?
