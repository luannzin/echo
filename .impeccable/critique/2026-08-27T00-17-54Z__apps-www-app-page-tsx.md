---
target: apps/www landing page
total_score: 23
p0_count: 3
p1_count: 2
timestamp: 2026-08-27T00-17-54Z
slug: apps-www-app-page-tsx
---
⚠️ DEGRADED: single-context (session policy forbids spawning sub-agents unless the user asks)

Target: `apps/www/app/page.tsx` — read at 1280×720 and 375×812 on the running dev server (localhost:3001).
Screenshots unavailable (Browser pane not displayed); all visual claims below come from computed
styles, the accessibility tree, and the DOM, not from eyeballing pixels.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | The Copy button's failure path is silent — the catch block just clears the flag, so the reader presses a button that does nothing and says nothing. |
| 2 | Match System / Real World | 2 | "Build the window", "Same build, three hosts", "A folder of files", "pglite open · idb://echo" are the author's private idiom. The reader is never told why WebAssembly Postgres is good for *them*. |
| 3 | User Control and Freedom | 3 | Static page, anchors work, nothing traps. No back-to-top beyond the wordmark. |
| 4 | Consistency and Standards | 3 | Internally consistent system. But four separate CTAs with three different labels all land on the same `git clone` box. |
| 5 | Error Prevention | 2 | "Install as an app →" points at `#install`, which shows `git clone`. The label promises an install; the destination hands over a build. |
| 6 | Recognition Rather Than Recall | 1 | **The product is described and never shown.** 0 images, 0 videos, 0 canvases, 0 screenshots. 13 SVGs, every one an abstract plate. A visitor must construct the entire app in their head from prose. |
| 7 | Flexibility and Efficiency | 2 | Exactly one path exists: clone the repo, install Bun, run a dev server. No hosted demo, no binary, no `npx`. |
| 8 | Aesthetic and Minimalist Design | 3 | The craft is real — the dither engine, the token discipline, the scroll-driven motion. Undercut by 11px all-caps body copy and a 435px decorative wordmark band that says nothing. |
| 9 | Error Recovery | 2 | The one failure the page can have (clipboard denied) has no recovery and no message. |
| 10 | Help and Documentation | 3 | Docs and README linked from four places. Nothing explains the Bun prerequisite before the command that needs it. |
| **Total** | | **23/40** | **Needs work — strong craft, wrong job** |

## Anti-Patterns Verdict

**Deterministic scan**: `detect.mjs --json apps/www` returned `[]`. Zero findings. This is a **false
negative**, not a clean bill: the detector reads HTML/CSS, and every violation on this page is expressed
through a Tailwind `@utility` (`label`) applied in JSX, which it cannot resolve.

**LLM assessment**: it does not read as AI-generated. It reads as *reference-generated*, which for a
brand surface is the worse failure — AI slop is anonymous; this is traceable to one specific site.

Measured against `hermes-agent.nousresearch.com` live, nine structural correspondences:

| hermes-agent | apps/www |
|---|---|
| body background `rgb(0,0,242)` | `--color-brand: oklch(45.5% .305 264)` ≈ `rgb(26,26,255)` |
| Uppercase display headline, three lines | Uppercase display headline, three lines |
| `OPEN SOURCE • MIT LICENSE` eyebrow | `OPEN SOURCE · LOCAL FIRST · NO API KEY` eyebrow |
| Tabbed install box (macOS/Linux · Windows) | Tabbed install box (Web · Desktop) |
| Three platform cards (`MACOS 12+` / `WINDOWS 10/11` / `ANY DISTRO`) | Three platform cards (`ANY BROWSER` / `MACOS · WINDOWS · LINUX` / `A FOLDER OF FILES`) |
| Feature grid on a paper panel | Feature grid on a paper panel |
| `#1 CONNECT` / `#2 REMEMBER` numbered kickers | `#1 CAPTURE` / `#2 SEARCH` numbered kickers |
| All-caps mono feature body copy | All-caps mono feature body copy |
| Oversized wordmark band (`NOUS PORTAL`) | Oversized wordmark band (`echo · echo`) |

The one section hermes has that was **not** copied is `#preview` — a 2560×1440 looping video of the
desktop app, 692px tall, sitting directly under the hero. The chrome was transcribed; the proof was
skipped. That inversion is the whole critique in one line.

Against the impeccable brand register, five explicit bans are live on the page:

- **All-caps body copy** — six feature paragraphs at `font-size: 11px`, `letter-spacing: 1.98px`,
  `text-transform: uppercase`, `line-height: 15.4px`. Measured, not estimated.
- **Numbered section markers as scaffolding** — `#1`…`#6` on all six features. The features are not a
  sequence; nothing depends on reading Capture before Search.
- **Tiny uppercase tracked eyebrow above every section** — hero, platforms, footer, and six cards. Nine
  instances of the same 11px/0.18em label. That is grammar, not voice.
- **Zero imagery on a brief that implies it** — a note-taking app whose selling point is how it *behaves*.
- **Instrument Serif** is on the reflex-reject font list, and display-serif + mono-micro-labels + ruled
  separators is the named "editorial-typographic" reflex-reject lane. (Identity-preservation argues for
  keeping the face; it does not argue for keeping the lane.)

## Overall Impression

The engineering on this page is better than the page. A Bayer-dithered SVG filter chain that takes its
two colours from `feFlood` reading CSS custom properties, so a token change repaints the artwork and no
filter holds a hex — that is genuinely excellent work, and almost nobody will notice it, because it is
spent drawing rays and spirals that have nothing to do with note-taking.

Meanwhile the product underneath is remarkable and invisible. The app does query decomposition, learns
which of your own words are synonyms from distributional evidence, builds a project brief from notes
nobody maintains, answers "why did you file it there?" with the actual notes that argued for it, and runs
Postgres in the tab with no account. **The page mentions roughly a fifth of that, and demonstrates none
of it.**

Single biggest opportunity: **stop drawing spirals and start showing the app.** Every section that
currently holds an abstract plate should hold the product doing the thing that section claims.

## What's Working

1. **The token and filter architecture.** No component and no filter carries a hex value; the dither
   engine reads `--color-brand` through `flood-color`, so the artwork is genuinely part of the theme.
   Whatever the page becomes, this survives.
2. **Motion with no JavaScript.** Parallax, reveal and drift on `animation-timeline: view()`, all inside
   `@media (prefers-reduced-motion: no-preference)`, degrading to the finished state rather than to a
   blank section. Correct, and rare.
3. **Nothing on the page is a lie.** Every claim maps to something in `docs/STATE.md` that actually ships.
   Given how much marketing copy is aspirational, this is worth protecting through the rewrite.
4. **Responsive is clean.** No horizontal overflow at 375px; `min-w-0` is where it needs to be.

## Priority Issues

### [P0] A visitor cannot try echo. At all.
**Why it matters**: The entire page converts to one action: `git clone`, install Bun 1.3+, run a dev
server. Every CTA — "Get echo →" (×2), "Install as an app →", "Read the source →" — either lands on that
box or on GitHub. The audience who will do that is already on GitHub. `apps/web` is a **static export**
with no server and no account; it is a folder of files that could be on a URL today. Not having that URL
is the single largest conversion loss on the page, and it is a deploy, not a design.
**Fix**: Ship the app to a static host. Make the hero's primary CTA "Open echo" pointing at it, and demote
the clone commands to a secondary "or run it yourself" disclosure.
**Suggested command**: `/impeccable clarify`

### [P0] The product is never shown.
**Why it matters**: 0 `img`, 0 `video`, 0 `canvas`. A reader has to imagine the composer, the stream, the
palette, the Inbox plan and the Related panel from prose. Both reference sites do the opposite: x.ai/bot
runs simulated product moments in every section, hermes-agent puts a 2560×1440 desktop capture directly
under the hero. "Feels awesome and I want to test it" is a response to seeing something work, never to
reading that it does.
**Fix**: Give each claim its own demonstration. The composer typing and a chip appearing; the palette
decomposing a real query into chips; the Inbox plan grouping notes; the Related panel giving its reasons
in sentences. Built as real DOM in the site's own tokens, not screenshots — they stay sharp, theme with
the page, and cost kilobytes.
**Suggested command**: `/impeccable craft`

### [P0] Six paragraphs of body copy are set in 11px tracked uppercase mono.
**Why it matters**: 11px with 1.98px tracking in uppercase is a specification for a three-word label, and
it is carrying 25-word sentences here. All-caps removes word-shape, the single strongest cue in fluent
reading; at that size and tracking the words come apart into letters. This is the most-read text on the
page and the least readable. It is also an explicit brand-register ban.
**Fix**: Feature bodies become sentence-case sans at ~15-16px, ~1.6 line-height, capped at 65-75ch. Keep
mono uppercase for what it is for: one-to-three-word labels.
**Suggested command**: `/impeccable typeset`

### [P1] The page is a structural transcription of one of its own references.
**Why it matters**: Nine correspondences to hermes-agent, down to the numbered-kicker format and the
all-caps feature body. Anyone who has seen both will place it instantly, and the read is "borrowed",
which is the opposite of the reaction being aimed for. Worse, the borrowing is of the *chrome* — the
electric blue and the poster type — while the part that actually sells (the product preview) was left
behind.
**Fix**: Keep the brand's own committed assets — the blue, the dither engine, the mono labels, the no-hex
token discipline. Change the things that are hermes's rather than echo's: the numbered kickers, the
all-caps body, the platform-card triptych, the terminal band as decoration. Replace them with sections
shaped by what echo does that nothing else does.
**Suggested command**: `/impeccable bolder`

### [P1] The copy is written in the author's idiom, not the reader's.
**Why it matters**: "Same build, three hosts", "Build the window", "A folder of files", "Words first,
meaning next", "A week you can walk back", "pglite open · idb://echo". Each of these is meaningful *if
you already built the app*. To a visitor they are riddles. x.ai/bot's section headings are the
counter-example: "Message Bots like teammates", "Work with many Bots at once", "Bots get smarter over
time" — every one a plain sentence about what the reader will do.
**Fix**: Rewrite every heading as a sentence naming the reader's action or outcome. Reserve the invented
phrases for one place where the voice earns it, not nine.
**Suggested command**: `/impeccable clarify`

### [P2] The page ships a fraction of the product.
**Why it matters**: `docs/STATE.md` records four completed sub-projects the page says nothing about —
query decomposition into removable filter chips, distributional aliases (searching `HEREZE` returns three
`Deadlands` notes that never contain the word), the auto-derived project brief, Inbox filing plans you
review before anything moves, "why?" answered with the notes that argued for it, undo-the-last-note,
co-open ranking, editor mode. These are the differentiators. The six features on the page are the table
stakes.
**Fix**: Re-pick the features from what only echo does, and let the generic ones (offline, private) become
supporting proof rather than headline cards.
**Suggested command**: `/impeccable craft`

### [P2] The terminal band is decoration pretending to be proof.
**Why it matters**: It is captioned "the proof shot" in its own source comment, and it proves nothing —
four static lines behind a blurred halftone plate, showing a dev server booting. Nobody wants to see a
dev server boot. It occupies a full viewport band and the only motion in it is a blinking caret.
**Fix**: Either make it real — a session that types itself, one command producing an outcome the reader
cares about — or give the band to a product demo instead.
**Suggested command**: `/impeccable animate`

## Persona Red Flags

**Jordan (First-Timer / evaluating note apps)** — arrives from a link, reads "The note taker that learns
with you", scrolls. Sees no interface. Reaches a box that says `git clone` and `bun install`; does not
have Bun and is not going to install a package manager to evaluate a note app. Reads six paragraphs of
capital letters and stops at the third. Leaves without ever seeing a note. **Nothing on this page is
addressed to Jordan**, and Jordan is who a landing page exists for.

**Alex (Power User / local-first, self-hoster, the actual ICP)** — is the one reader served, and is still
underserved. Wants to know: what is the storage format, can I get my notes out, what happens with two tabs
open, how big is the model download, does it work offline before the model lands. The page says "Postgres
compiled to WebAssembly" and stops. The honest, interesting answers all exist in `docs/STATE.md` — a
~120MB multilingual model, a 200-note list cap, two tabs genuinely unhandled — and none are on the page.
Alex clicks through to GitHub in about eight seconds and the site's job is done by the README.

**Sam (Skeptic / "no-AI" claim)** — the strongest thing echo has is that the learning is *derived, never
stored*, so "forget this" is a real promise rather than a hidden flag, and rules are recomputed from
corrections on every read. That is a genuinely unusual privacy architecture and it appears on the page as
"Nothing is trained — your notes are the model", which Sam reads as marketing. **The proof is available
and unused.**

## Minor Observations

- **The wordmark band costs a full screen and says nothing.** `echo · echo` at 435px, `aria-hidden`, one
  horizontal drift. On mobile it is 127px tall in a page that is already 9.3 screens long.
- **The page is long for how little it says.** 7581px at 375px wide, carrying six short features.
- **Four CTAs, three labels, one destination.** "Get echo →", "Install as an app →" and "Read the source →"
  all end at the same two places.
- **No skip link**, and the hero eyebrow is the first thing a screen reader hits.
- **Hero display type is 99.84px at 1280px** and clamps to ~118px, over the 96px ceiling. It reads as
  shouting rather than scale, and it is why the h1 wraps to three lines in a 605px column.
- **`grain` at `opacity: 0.58` with `mix-blend-mode: overlay`** sits over everything at `z-index: 60`,
  including the 11px uppercase text. The two problems compound.
- **The Bun prerequisite is never stated** next to the command that needs it.
- **No licence named**, deliberately, per `docs/STATE.md`. For an open-source project this is the second
  thing a visitor checks after "can I try it".
- **The footer says "Built in the open · 2026"** — a hardcoded year that will be wrong in January.

## Questions to Consider

- If a visitor could only see one screen of echo before deciding, which screen would it be? That screen
  belongs directly under the hero, at full width, moving.
- The hardest thing echo does is tell you that two of your own words mean the same thing, from evidence,
  with no model and no taxonomy. Could the page *demonstrate* that in ten seconds instead of claiming it
  in a sentence?
- What is this page for — persuading a stranger, or briefing someone who already decided? It is currently
  built for the second and titled for the first.
- If the electric blue and the dither engine were the only things kept, what would the rest become?
