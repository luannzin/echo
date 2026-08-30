# STATE

Last updated: 2026-08-29 · Phase: **6 complete, two fixes passes, editor mode, S1–S4, landing
rebuild, E1, E2, desktop fixes pass, P8a–P8e (language and arrival), MCP, release pass**

Product: **echo** — open source, no-AI note taker that learns with you.

## Done

### Phase 0 — Skeleton
- Bun workspaces (`apps/*`, `packages/*`, `tooling/*`) + Turborepo task graph (`build`, `dev`,
  `typecheck`, `test`, `clean`).
- Biome as the single lint + format + import-sort tool. Config at `biome.json`, Tailwind CSS
  directives enabled in the CSS parser.
- `tooling/tsconfig` presets: `base`, `library`, `react-library`, `next`. Strict everywhere,
  including `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.
- Eleven empty-but-valid packages, each with a README stating its single responsibility:
  `types, core, db, search, embeddings, learning, parser, sync, config, ui, test-utils`.
- `apps/web`: Next.js 16 (Turbopack) + Tailwind v4, dark-first token set, three-pane app shell
  (`components/app-shell.tsx`) with honest empty states — no fake notes, no placeholder data.
- Docs: `README.md`, `docs/ARCHITECTURE.md` (layering + the 10 boundary rules), `docs/PLAN.md`,
  this file. `.claude/launch.json` so the dev server starts the same way every time.

Verified: `bun install` → `bun run typecheck` (12/12) → `bun run lint` (clean) → `bun run build`
(static build OK) → `bun run dev:web` renders the shell at http://localhost:3000 with no console
errors.

Installed versions: bun 1.3.14 · turbo 2.10.11 · biome 2.5.10 · typescript 7.0.2 · next 16.3.3 ·
tailwindcss v4.

### Checkpoint A — design system
- coss ui installed into `apps/web` via `shadcn@latest init -b base -p nova` + `add @coss/ui
  @coss/colors-neutral`. All 54 primitives present in `components/ui/`, Base UI under them.
- Registry files (`components/ui/**`, `hooks/use-media-query.ts`, `lib/utils.ts`) excluded from
  Biome — the CLI owns them, hand-edits would be overwritten.
- Brand tokens + dark shell tuning in `app/globals.css`; fonts wired through `next/font`
  (Geist / Geist Mono / Instrument Serif for display).
- Shell rebuilt to the reference direction: 56px icon rail with tooltips, collapsible navigation,
  quiet top bar, intelligence panel. Unbuilt destinations render disabled and name their phase.
- `docs/DESIGN.md` records the direction: loud marketing surface, quiet application surface.

### Phase 1 — Local persistence and note CRUD
- `@echo/types`: zod schemas as the single definition (`Note`, `Folder` + create/update inputs),
  types inferred. `DEFAULT_WORKSPACE_ID` lives here.
- `@echo/db`: PGlite + Drizzle. Schema in `src/schema.ts` (`folders`, `notes`), migrations generated
  by drizzle-kit and inlined into `src/migrations.generated.ts` by `bun run db:generate` so they
  ship to the browser. `migrate()` is versioned, transactional and idempotent, tracked in
  `echo_migrations`.
- `@echo/core`: `createEcho({ repositories })` composition root, typed event bus, note and folder
  services. Titles are derived from content (`deriveTitle`), never asked for. Clock and id factory
  are injected so services test deterministically.
- `apps/web`: `EchoProvider` opens PGlite lazily in the browser (`idb://echo`), note list, textarea
  editor, 500ms debounced autosave with a save indicator, empty states for loading/error/no-notes.
- Tests: 13 passing — `bun test`, no runner dependency. Services against an in-memory repository,
  repositories against a real in-memory PGlite migrated from the real migration files.

Verified in the browser: create note → type → autosave ("Saved") → reload → note and content
survive from IndexedDB, list ordered newest-first, no console errors.

### Capture UX
- Home is a composer, not a document: a big always-focused text area, no "New note" button
  anywhere. Enter commits, Shift+Enter is a new line, and nothing is written to the database before
  the writer commits — no empty notes accumulate.
- Deleting really deletes — a note, its labels, its task and its vector, by cascade. The way back is
  the undo stack, never an archive nobody asked for. Reachable from the note list's context menu, the
  open note's header, and the simpler mode's aside. Not from a stream row: two thousand rows each
  wrapped in a menu is a cost the stream cannot pay for a gesture the list beside it already offers.
- **Ctrl Z walks back through the session**, not just off the last note sent (`Undoable` in
  `app/page.tsx`, 25 deep). Every reversible thing pushes a step and undo pops one, so three deletes
  take three presses. A capture is the one kind that does not stack: taking one back hands its words
  to the composer, and taking back an older one would need the composer holding two drafts at once,
  so a second capture replaces the first. Reading a note or changing view expires the pending
  capture and leaves the deletes alone — a delete is not a moment, it is something that happened.
- **A note that just went claims Ctrl Z from the box under the cursor**, and hands it back the
  moment the reader types (`undoClaimed`, cleared by a window `input` listener). Without it the
  simpler mode has no undo at all: deleting from the aside hands focus straight back to a pane with
  words in it, and `shortcutFor` can only see the box the keystroke came from.
- Committing opens the saved note in the editor with autosave; Esc or "Back to writing" returns to
  the composer.
- `apps/web` is a **static export** (`output: "export"`) — no server, no hydration mismatch, and
  self-hosting is copying `out/`.
- Writing is never gated on loading: the composer is focused and writable from first paint, and
  `capture` awaits the database itself rather than React state. Committing during a cold start
  works. The note list carries that latency instead, with coss `Skeleton` rows matching the real
  row geometry.
- A prompt is drawn at random per visit and fixed for that visit, so nothing shifts under the
  cursor.
- **Capture is optimistic end to end.** Enter puts the note on screen, clears the composer and
  switches view without awaiting anything; the database write happens behind it, and a failure
  removes the note again. The composer has no busy state because there is nothing to be busy about.
- The note that just arrived carries its own entrance: it rises in over 240ms and its highlight
  fades over the following second, so the eye can follow where the writing went.
- Saving from home moves into the **stream**: the composer travels from the centre of the screen to
  the bottom (FLIP, 340ms, `lib/flip.ts`) and every note appears as an entry, oldest first, with day
  separators and times. Writing continues from the docked composer; each new note lands at the
  bottom and the view follows it.
- The note list follows one rule in every view: the reader's collapse preference. The stream no
  longer force-hides it.
- Pointing at a note in the list targets it in the stream and walks the view to it: 150ms of intent
  before it moves, smooth scroll to centre, and no movement at all when the note is already on
  screen. Focus does the same, and `prefers-reduced-motion` gets an instant jump instead.
- Hovering moves a target down the stream: the row under the pointer takes a soft background and a
  marker on the leading edge, outside the text column so the writing never shifts. Focus does the
  same, so the target is not something only a mouse can move.
- Notes are editable from either side: the sidebar, or the pencil that appears on hover
  (and on keyboard focus) over an entry in the stream. Closing the editor returns to whichever
  screen opened it.
- Opening a note puts the caret after the last character and scrolls to it — opening means
  continuing.
- The rail's pen is Write: it returns home from anywhere and marks itself current.
- One ghost button in the top bar names the destination — "Stream" while writing, "Write" while
  reading — and runs through the same FLIP path as saving. Disabled until a note exists.
- Interface review pass (accessibility, layout, writing, typography, color, UI): skip link to the
  workspace, a heading on every view, rail placeholders kept focusable with `aria-disabled` so their
  tooltips can be read, the panel toggle hidden where the panel does not exist, 16px inputs on
  mobile, micro-labels off the 10px floor, logical properties throughout.
- The note panel keeps its 240px in the stream and only fades (`inert` when hidden). Unmounting it
  dragged the whole workspace sideways mid-transition; now the composer's travel is purely vertical,
  measured at 0px horizontal shift in both directions.
- The stream is one column, not a chat: every note is a full-width row of the same width, separated
  by hairlines, with a relative timestamp (`4m`, `3h`, `2d`, then the date) and a day label where the
  date turns over. No bubbles, no ragged right edge.
- Stream rows and the composer share one scroll container, which is what keeps their widths
  identical — a separate scroller made the column 15px narrower than the composer via its scrollbar.
  Rows carry no horizontal padding of their own, so text, timestamps, day labels, hairlines and the
  composer's edge all sit on one line at the column edge.
- No context and no custom hooks: `app/page.tsx` owns notes, selection and the database handle, and
  every component takes plain props. The editor owns its own save state, because nothing else needs
  to know about it.
- Motion tokens (`--ease-out-quart`, `--ease-in-out-quart`, `rise`, `settle`) live in the theme.
  Applied to: heading entrance, list stagger (28ms, first 8 items), save-button scale+fade,
  save-state indicator, focus ring, press feedback. Reduced motion still collapses all of it.

### Fixes pass — panels, tasks, dates, capture
- **Side panels give their width back again.** Both asides carried their open width in the base
  class list *and* in the open branch, so the closed branch's `md:w-0` / `lg:w-0` lost the cascade
  to it: the panel faded out and kept its column. Closed is now 1px of border, and the workspace
  grows from 664px to 1222px at 1280 wide.
- **Search sits over the writing.** The header is a three-column grid, so the middle cell is centred
  on the workspace rather than pushed right by whatever is beside it.
- **Detection acts, and is corrected rather than confirmed.** A note that reads like a task becomes
  one on Enter, with whatever date the note gave it; the chip is a statement of what will happen and
  its menu is where the reader says otherwise. One threshold (`WORTH_SAYING`) now decides both
  saying and doing — a suggestion the interface showed but quietly declined to act on was the
  original bug.
- **A date that was only mentioned still sets the due date.** It earns a chip too, because a due
  date nothing on screen names cannot be corrected.
- **The Portuguese chrono locale's gaps are filled** (`packages/parser/src/relative-pt.ts`):
  `em 3 dias`, `daqui a duas semanas`, `dentro de um mês`, `semana que vem`, `próximo mês`,
  `depois de amanhã` — the last three returned nothing, and `daqui a 3 dias` read as three o'clock.
- **A bare `06/08` written on 26 August means this year.** `forwardDate` is right for a weekday and
  wrong for a date the writer spelled out; a 30-day grace window keeps `05/01` written in December
  meaning January.
- **Task rows.** The whole row ticks the box (the checkbox stays the only control a keyboard or
  screen reader sees), the source note's folder and a `Done just now` stamp are on the row, the due
  date carries its exact date as a title, and focus inside the row lights it the way hover does.
- Deleted the commented-out webpack alias in `apps/web/next.config.ts` and the unused
  `transformersWeb` path it left behind — it was failing `bun run lint`.

### Latency and craft pass
- **Capture stopped waiting on the disk.** Every note blocked the writing surface for ~80ms inside
  a single PGlite `INSERT`, flushing to IndexedDB before the query returned. `relaxedDurability`
  moves the flush behind the query: measured 80ms → 16-30ms in the running app.
- **Ticking a task is optimistic**, the way capture already was. It moved sections and stamped
  `Done just now` before the write, instead of after it.
- **`folderPaths` was being named and sorted once per row**, in the note list and again in the
  Inbox. Once per list now, and `NoteRow` and `TaskRow` are memoized — a capture appends one row
  rather than re-drawing the notebook.
- **Keyboard navigation skips the view transition.** `navigate` takes `instant`, and the shortcuts
  for Write and Inbox pass it. 260ms of continuity reads as continuity when you clicked, and as lag
  when you pressed a key you press forty times a day.
- **`em 3 d` is no longer a date.** chrono's English abbreviation for three days is also what
  `em 3 dias` looks like two keystrokes in, so the chip appeared, vanished at `em 3 di` and came
  back at `em 3 dia`. A single-letter unit is now ignored.
- **Places are one affordance.** The Inbox row never showed as current, and "All notes" was a small
  link *under* the tree. Both are `PlaceRow` now, above the folders, and one `row` style in
  `shared/lib/styles.ts` carries the Inbox, All notes, every folder and every note in the list —
  including the 44px height coarse pointers get and mice do not.
- **Done folds.** Past four finished tasks the section becomes a `<details>`, so what is still open
  keeps the screen.
- Long folder paths truncate in the Inbox's "Move to …" button instead of pushing the row wide.

### Editor mode
A second way to use echo, modelled on GNOME Text Editor: a page to write on, the notes you have
open along the top, and nothing else. Lives in `apps/web/modules/editor/`.

- **It replaces the shell rather than living in it.** `app/page.tsx` branches above `AppShell`, so
  the rail, panels, top bar and bottom nav never mount. Rendering the full frame and then hiding it
  is how you get a rail that flashes on every toggle. Both modes read the same `notes` state above
  the branch, so toggling is a boolean.
- **The desktop app only.** Not a viewport question — the website never offers it, whatever the
  screen. `shared/lib/tauri.ts` asks whether Tauri injected itself; one build still serves both, so
  a build-time flag would mean two. The window's own `minWidth` (600) is what guarantees the tab
  strip has room, which is a config value instead of a media-query listener.
- **Tabs are session memory** (`modules/editor/session.ts`): a `string[]` in `localStorage`, array
  order *is* the order, so nothing about a note can move its tab. New tabs append; dragging one onto
  another takes that one's place — rightwards lands past it, which is what makes the last position
  reachable without an empty drop zone at the end. Closing drops it from the memory and touches
  nothing else. Survives restarts; fresh install is one blank tab.
- **The active tab scrolls itself into view** (`nearest` on both axes, so only the strip moves), which
  is what puts a new note on screen when the strip is already wider than the window. The strip's own
  scrollbar is hidden: platforms that overlay it drew a bar across the tabs exactly when the pointer
  was aiming at one. Tabs are 40px tall for the same reason.
- **A new tab is an id and nothing else.** It becomes a row under that same id the first time
  someone types into it, so the tab never has to be swapped — and toggling in and straight back out
  leaves nothing behind, which is the promise the composer already makes.
- **Split view** is two panes on a CSS grid, each an `EditorPane`, the unfocused one dimmed. The
  split opens onto the neighbouring tab, or onto the same note when there is no other.
- **The aside** slides over rather than taking width, so opening it never reflows the words someone
  is mid-sentence in. Flat list, every note, and no field to narrow it: finding a note by what it
  says is the palette's job and it is one keystroke away. Rows carry `content-visibility`, and a
  right-click deletes — the tab goes with the note, and Ctrl Z brings both the note and its labels
  back.
- **A strip above the words** says what the note is beyond them: whether it is a task, when it is
  due, what it is labelled with. It is always there, empty or not — one appearing on the first
  "todo" would push the line being written down the screen mid-sentence. Stored beats read: a filed
  task and its date are stated (solid chips), and where there is none the note's own words are read
  with `@echo/parser` and named as a reading (dashed chips, deferred like the composer's).
  Nothing in this mode *files* a task or a label, so a note written here carries neither until it is
  opened in the full app — the reading is what is left, and it is honest about being one.
- `useAutosave` (`modules/notes/autosave.ts`) is now shared by `NoteEditor` and `EditorPane`: one
  debounce, one flush-on-unmount, one definition of "saved".
- `apps/web` has a `test` script and bun types now, so `session.ts` is covered (7 tests).

- **It is a window, not a page.** The header carries `data-tauri-drag-region`, so the empty stretch
  of the tab strip drags the window the way a native title bar does (children with their own
  handlers keep them, and outside Tauri the attribute means nothing). `overscroll-behavior: none`
  stops the rubber-band at the end of a list, and chrome — buttons, headers, asides, menus — is
  `user-select: none`, with the writing surfaces and note bodies put back to `text`. A caret
  blinking in the chrome and a bouncing scroll are the two things that give a desktop build away as
  a browser.
- **The note fills the pane.** No measure: a 68ch column is right for reading a stream, and a text
  editor is a page you write on, so the window's own width is the measure.
- The desktop window opens at 960×700 rather than 1280×820, and `zoomHotkeysEnabled` gives it
  ctrl +/- zoom. On Linux and macOS that is a polyfill Tauri injects, so it needs
  `core:webview:allow-set-webview-zoom` in `capabilities/default.json` to have anything to call.
- **It opens in the mode it was closed in**, without passing through the other one. This is a static
  export, so the prerendered shell is on screen before React loads and nothing inside React can stop
  it — a blocking script in `layout.tsx`'s head sets `data-echo-mode` on `<html>`, one rule in
  `globals.css` holds `[data-shell]` back while it says `editor`, and React takes the attribute over
  on mount. Same trick a theme uses, for the same reason. It fails closed: the script requires Tauri
  to have injected itself, because holding back a shell that nothing will replace is a blank window,
  while missing the check only brings the flash back. On the web a leftover `echo:editor-mode` is
  deleted on mount rather than honoured.
- **Fixed, and it was data loss:** a pane takes its text once, when it mounts. Mounting while the
  database was still opening took an empty string, and autosave then noticed the note said something
  different and wrote the empty string over it — every note opened on a cold start was emptied and
  its title fell back to `Untitled`. Panes now wait for `loading` to clear, so a note is only "new"
  once there is something to be new against. Editor mode also renders the storage failure now; it
  used to say nothing while typing into a database that was not there.
- The `getEcho` failure path logs its cause instead of swallowing it, so "Local storage could not be
  opened" is now traceable.

- **A tab closes on a middle click**, the way a browser tab does. `mousedown` is preventDefaulted
  because that is where the autoscroll cursor would otherwise open, before the click ever lands.
- **A tab has a context menu**: pin to the desktop, close. The menu is the keyboard twin of both the
  middle click and the hover-revealed close control.
- **The aside opens on a click and closes on one.** Hover-to-open and leave-to-close are both gone:
  a panel that appears because the cursor crossed a button on its way somewhere else is a panel
  nobody asked for. Escape closes it, and so does clicking the writing behind it.
- **It reopens onto the tab that was being written in** (`echo:editor-active`), not the last tab in
  the strip. Its own key rather than a position in the session, because dragging a tab reorders the
  session and reordering must not move where you were.
- **A tab can be pinned to the desktop as a sticky note** (`app/postit/page.tsx`,
  `shared/lib/postit.ts`): its own Tauri window, `decorations: false`, `alwaysOnTop`, out of the
  taskbar, dragged by its header (`data-tauri-drag-region`) and resized by a corner grip
  (`startResizeDragging`). Fixed paper colour rather than a theme — it sits among other windows and
  a sticky note that follows the app's theme stops reading as one.
  - **It never opens the database.** PGlite has one writer and the main window is it, so the words
    travel over Tauri's event bus: `postit:ready` asks, `postit:note` answers, `postit:write` hands
    each edit back (500ms debounce), `postit:open` sends the note home and closes the window.
    `app/page.tsx` holds the listeners, so they outlive a trip back to the full shell.
  - Pinning closes the tab, and sending it back reopens it — while a note is on the desktop that
    window is the one editing it. Window labels are `postit-<note id>`, so pinning a note already
    out there focuses it instead of opening a second one.
  - `capabilities/default.json` covers `main` and `postit-*`, and adds
    `core:webview:allow-create-webview-window` plus window `close`, `set-focus`, `start-dragging`
    and `start-resize-dragging`.

Deliberately not built: tab overflow menu, drag-to-resize the split, more than two panes, per-tab
unsaved dots (autosave means nothing is ever unsaved), editor mode on phones, filing a task or a
label from this mode, sticky notes on the website (there is no second window to open), a sticky
note that survives echo being closed.

### S1 — Temporal context
First of four sub-projects turning echo from a note app that reads notes into one that holds a
reader's history. Spec: `docs/superpowers/specs/2026-08-26-temporal-context-design.md`. S2 is
personal vocabulary, S3 query understanding, S4 project memory — each gets its own spec.

- **The parser reads spans, not only instants.** `@echo/parser/periods.ts` finds four kinds, all
  deterministic and both languages: trailing windows (`nas últimas 3 semanas`, `the past 2 months`),
  whole units (`semana passada`, `este mês`, `semana que vem`, `semana retrasada`), month edges
  (`no fim do mês`), remembered neighbourhoods (`recentemente` ≈ 14 days, `faz uns 3 meses` = that
  month ± half of one), and spans named against something that happened (`depois que comecei
  HEREZE`). Every window constant is named and carries a `ponytail:` comment — they are the one
  place per-writer tuning would land.
- **`naquela época` is deliberately not read.** It is unanchored: without a second anchor in the same
  sentence it names no stretch of time, and a span echo invented is one the reader cannot correct.
- **Spans beat instants.** `detectMentions` returns both in one list, and a matcher never re-reads
  what a more specific one already claimed — `semana que vem` is a week to work through, not the
  Monday chrono can also find inside it. `DetectedDate` gained `index` so both readings compete on
  position.
- **Numbers are shared** (`parser/numbers.ts`): `daqui a duas semanas` and `nas últimas duas semanas`
  are the same two, and `relative-pt.ts` stopped keeping its own copy of the map.
- **Anchors are resolved where the corpus is** (`core/temporal.ts`), not in the parser, which has no
  corpus. A folder or category name maps to the date of its first note — earliest wins, because a
  project began when its first note was written. The parser captures up to three words after
  `desde`, so candidates are tried longest first, and an anchor the corpus has never heard of is
  **dropped rather than guessed at**.
- **Schema, migration `0008`:** `note_temporal` (one row per note, `parsed_at` + `mentions` jsonb)
  and `observations` (append-only, indexed on type + subject + time). Derived data: both can be
  dropped and rebuilt. There is a row in `note_temporal` for every note that has been read,
  *including notes that name no date at all* — that row is the difference between "already parsed,
  found nothing" and "not parsed yet", and without it chrono would re-read every dateless note on
  every pass.
- **Visits are not corrections.** `observations` is a separate table from `learning_events` on
  purpose: rules are derived from corrections, and walking around the app must not teach echo things
  nobody said. `observations.seen()` returns *the visit before this one* from the same call —
  otherwise "what changed" would be measured against a baseline its own write had just moved to now.
  A repeat inside five minutes is the same visit.
- **The analyzer has two independent queues.** Reading time needs no model, so a fresh install has a
  working timeline long before the first vector exists, and a model that never loads never holds it
  up. Same contract as the embedding pass: the queue is the database, so a failure costs a retry.
- **The model does not stay resident.** The embedding worker is thrown away and rebuilt from the
  browser's cache — 60s after the last request, and every 64 embeddings whatever happens
  (`shared/lib/embedder.ts`). Measured on the Linux desktop build: the WebKit web process grows by
  megabytes per note embedded and gives none of it back, so a fresh install working through its
  backlog climbed past 10GB and was still climbing, in ~77k small anonymous mappings. Idling out is
  no help there, because a backlog never goes idle — the count is the ceiling that holds regardless
  of which allocation inside the model runtime is the one that never comes back. The published
  status is left alone on purpose: it says the model is *available*, not that it is loaded.
- **Both queues wait for the notes to stop moving** (`settleMs`, 4s). Autosave writes every half
  second of quiet, and every write used to start a full pass: writing one long note re-embedded it
  dozens of times and only the last vector was ever the note. The passes are derived from the notes
  rather than from the events, so waiting costs nothing — `analyzer.run()` still catches up at once,
  which is what startup and the tests use.
- **The timeline is its own destination** — the rail's `Recent — soon` placeholder became real. One
  row per day rather than per note: the date, what the day was about, the notes on it and how many.
  Concepts are the reader's own categories where the notes carry them, and the words the notes used
  where they do not, so a day is never blank just because nothing was labelled. Month headings are
  sticky; each day row carries `content-visibility`, so a year of writing costs the layout of what is
  on screen. It shows whatever the pane has narrowed to, so selecting a folder turns it into that
  project's history without a second control to keep in step.
- **A "Now" band**, not a notification. What this week already contains according to the notes
  themselves — `falar com o João semana que vem` appears there the week it pointed at. Backward
  fuzzy windows are left out: `recentemente` reaches from a fortnight ago up to today, so it overlaps
  this week by construction and would sit in the band forever. Nothing here becomes a task: a task
  exists only where the writer agreed to one.
- **"Since you were last here"** names what arrived in a project while the reader was away, and which
  of its concepts are new — concepts that appear in the new notes and appeared in none of the older
  ones. Nothing new renders nothing at all; a block that says "no changes" is a block that gets
  scrolled past every time.
- Tests: 26 new (`parser/periods.test.ts` 21, `core/temporal.test.ts` 14 across anchors, timeline,
  changes and observations, `db/temporal.test.ts` 6 against real PGlite). 139 pass overall.

Verified in the running app: five notes captured, the timeline showing them under a sticky August
heading with keyword concepts, the Now band holding `ate sexta` and correctly refusing `semana que
vem` (next week is not this week), a folder created and the view scoped to it by name, and — after
filing a new note into that folder — "HEREZE · since you were last here, 1 minute ago" naming it.

**Fixed while verifying:** the Now band was reading every note rather than the narrowed list, so a
scoped timeline showed another project's week.

### S2 — Personal vocabulary
Second of the four sub-projects. Spec direction: the reader's own words, learned from the reader's
own notes. No taxonomy, no thesaurus, no model and no API key — every word echo offers came out of a
note they wrote.

- **`@echo/learning/vocabulary.ts`** holds which words the reader uses, which they use *near* each
  other, and which they use *in the same places*. Built from the same corpus read that already
  filled the phrase model, kept in memory like the vectors, and derived — it can be thrown away.
- **Concepts, with nothing to tag** (item 13). `conceptsOf` ranks a note's words by how much they
  stand out in it against how ordinary they are across the corpus. The note editor shows them under
  the categories, quieter, dashed: nothing had to be created first, and a concept exists because the
  reader keeps writing it. One press promotes one to a real category; one press says the note is not
  about it. A word the corpus has seen once is never a concept — at that count a typo and an idea
  look the same.
- **Aliases** (items 11, 12) come from *distributional* similarity: two terms are the same thing to
  this reader when they keep the same company. `HEREZE ≈ Deadlands`, `prod ≈ production ≈ produção`.
- **What actually makes that work is not the similarity.** Measured on a real corpus, the noise
  scores *higher* than the true pairs: `prod ~ estável` cosines at 0.86 while `prod ~ production`
  manages 0.81, because a word written beside all three spellings keeps better company with each of
  them than they keep with each other. No threshold separates those. What does is that a synonym is
  the word the reader reaches for **instead** — so the two hardly ever share a note, while a word
  merely written near them shares nearly all of them. `COMPANIONS` (0.15) carries the whole result;
  the similarity floor, the shared-context floor and the mutual-shortlist check only trim what is
  left.
- **A word in fewer than three notes gets no synonyms at all.** Saying two of someone's words are
  one word is the strongest claim in the package, and a profile built from two notes is not a
  profile. Below that echo says nothing rather than guessing — the same bargain the rest of the
  learning engine makes.
- **Known and deliberate: opposites read as substitutes.** `estável` and `quebrou` fill the same slot
  and are never written together, which is exactly the shape of a synonym. Telling them apart needs
  something that knows what words mean, which echo does not have on purpose. Pinned by a test so it
  is a decision on the record; it stays because the claim on screen is "you may also mean", refused
  with one press, and the alternative is offering nothing.
- **Aliases widen the search** (item 11's payoff). Searching `HEREZE` runs a second indexed query for
  `Deadlands` and merges the ranks, with the word actually typed outranking the word echo worked out
  is the same thing. A second lookup rather than a widened `tsquery`: the index is a lookup, so
  asking twice costs less than teaching every caller to build an expanded query.
- **"You may also mean"** (item 8) sits above the palette's answers — the reader's other spellings
  for the word, the phrases they build around it (`phrasesFor`, from a new `before` map beside the
  phrase model's existing `after`), and what they tend to write beside it. A phrase whose second word
  is a stopword is dropped: `do HEREZE` is a preposition, not one of their phrases.
- **Every alias is refusable.** The × on an alias chip records `signal_rejected` on kind `alias`,
  filed under the sorted pair so the belief has one home rather than two that could disagree. Search
  obeys immediately, and the Learned panel shows it immediately — `alias` and `concept` rules skip
  the `CONFIDENT` threshold on purpose: they are not inferred *from* a correction, they **are** the
  correction. A refusal that took effect but could not be seen or undone would be a change nobody
  could take back.
- Tests: 20 new in `vocabulary.test.ts` and `phrases.test.ts` over a corpus written the way one
  person writes. 155 pass overall.

Verified in the running app on an 18-note corpus: searching `HEREZE` offered `Deadlands` and returned
all three `Deadlands` notes, none of which contain the word; refusing the pairing removed it from the
suggestions and from the results, and named it in the Learned panel as “deadlands” and “hereze” are
not the same thing, with an undo; the note editor listed the note's concepts, dismissing one dropped
it and promoted the next word up, and promoting `merchant` made it a real category on the note and in
the pane.

**Fixed while verifying:** `do HEREZE` was being offered as a phrase; and `Count` read "1 notes
tagged merchant" to a screen reader — the plural now lives in the component rather than in each
caller's template string.

### S3 — Query understanding
Third of the four. A question is taken apart before anything is searched, and what comes back is
ordered by whether a note *belongs* rather than only by how closely it reads.

- **`@echo/core/query.ts` takes a question apart.** "Notes about auth from last month in my Work
  projects" is four questions wearing one coat: a subject, a stretch of time, a place, and
  connective tissue that means nothing alone. Deterministic, and built on what S1 and S2 already
  had — periods come from `detectPeriods`, anchors from `buildAnchors`, places from the reader's own
  folders and categories.
- **Filters narrow, and every one is a chip one press from gone.** Hard filtering is what makes
  "from last month" mean something instead of nudging a sort order — and it is only fair because
  nothing is ever hidden by something the reader cannot see. The chip row also says how many notes
  were set aside, so narrowing is never silent.
- **Framing is stripped and reported, not eaten.** "Aquela ideia que eu tive sobre fazer o mapa
  parecer infinito" is a person circling a question; the question is the last six words. Twelve
  patterns across pt and en, longest first. The words that came off are shown, because a search that
  quietly ignores half of what you typed is one you stop trusting (item 10).
- **Place matching is index-safe.** Names are matched whole-word against a fold that preserves length
  — `foldName` collapses whitespace, which would have slid every index after it and cut the wrong
  span out of the question.
- **A filter echo cannot place is dropped, and the words stay.** "Desde que comecei Vênus" against a
  corpus that never heard of Vênus yields no period *and* leaves `Vênus` in the search terms.
- **Ranking gained a fifth signal, and meaning gave up ten points to it.** `contextScore`
  (`@echo/search/context.ts`) blends four things a note's words cannot say: the same project (0.35),
  being opened together (0.30), shared concepts (0.25), the same fortnight (0.10). Weights are now
  semantic 0.45 · lexical 0.22 · context 0.18 · recency 0.08 · interaction 0.07, still summing to
  one. Tested at both ends: a note that belongs completely passes one seventeen points closer in
  meaning, and does not pass one thirty points closer.
- **Co-opens** (`@echo/core/co-open.ts`). `note_opened` joins `project_seen` in the `observations`
  table S1 built for exactly this — still apart from `learning_events`, so browsing never derives a
  belief. Two notes read within ten minutes are a pair; a note read twice is not its own partner;
  togetherness is measured against the note's own strongest partner, so a reader with two hundred
  opens and one with ten thousand get the same scale.
- **The Related panel answers "why".** Meaning nominates four times what is shown and belonging
  orders it, and each row carries its reasons as sentences — "you usually open them together", "it
  is in the same project" — never as a second number.
- Tests: 21 new (`query.test.ts` 12, `context.test.ts` 8, co-opens 3 in `temporal.test.ts`). 176
  pass overall.

Verified in the running app: `notes about cache in HEREZE` showed a `HEREZE` chip, said `16 set
aside` and returned only that folder's notes; `notes about cache from last month` correctly returned
nothing with `18 set aside`, and pressing the `last month` chip brought every cache note back;
`aquela ideia que eu tive sobre fazer o mapa parecer infinito` put the mapa note first with the
framing shown; and after reading two notes together three times, the Related panel ranked the paired
note above an equally-scoring one and said `you usually open them together`.

**Deliberately not built:** a `type:` filter. Item 9's example decomposes to `type: notes`, but notes
are the only thing the palette searches — the chip would be decoration until tasks are searchable
too.

### S4 — Project memory
Last of the four. What a project is, where a pile of notes would go, and why echo thinks so — all
derived, none of it maintained by hand.

- **`@echo/core/brief.ts` — the project brief.** Nobody writes this and nobody keeps it current:
  there is no project description to go stale, because it is built from the notes every time it is
  read. Count, span, the latest few notes, recurring themes and what is still open. `null` for an
  empty project — an empty brief would be a lie about a project that has nothing in it.
- **Themes lead with the reader's own words.** Stated categories first, most-used first, then the
  concepts the writing is distinctive for against the whole corpus (S2's vocabulary), with anything
  the reader already named filtered out so echo never repeats a word back at them. A project nobody
  has labelled is still described — in the words its own notes are distinctive for.
- **The brief sits on top of the scoped timeline.** Selecting a folder or category already made the
  timeline that project's screen; it now reads top to bottom as *what this project is → what changed
  while you were away → what this week holds → the days themselves*. No second destination, and
  nothing that has to agree with a count somewhere else.
- **Organize the Inbox** (`modules/inbox/plan.ts`). One press works the whole pile out and shows it
  grouped by destination — every note visible under the folder it is bound for, every one
  re-assignable without leaving the plan, and nothing moved until "File N". Filing fourteen notes
  wrongly is a far worse afternoon than filing them one at a time, so the plan is something the
  reader reads rather than something they undo. Accepting records the same `signal_accepted` a
  single acceptance does: filing a note is what teaches echo where notes like it go.
- **"Why?" answers** (item 16). The Inbox row's evidence badge is a disclosure now: the habit first,
  then the notes that actually argued for it, by name. A reason you can open is a reason you can
  disagree with; a percentage is not.
- **"Because you usually…"** (item 17). `reasonsFor` intersects the note's concepts with the concepts
  common to the suggested folder's notes and says it plainly — *you usually put Next and prod notes
  there*. Concepts, not categories alone: categories would leave this silent on a corpus nobody has
  tagged, which is exactly the corpus concepts were built for. Read on demand and cached per note
  until the note changes, because answering "why?" for a folder of fifty notes reads all fifty.
- **Soft placement** (item 14). A note's folder now reads `In Prod` rather than as a bare fact, with
  its labels and concepts directly beneath — the folder is the likeliest place a note lives, never
  the only way to reach it.
- Tests: 12 new (`brief.test.ts` 7, `plan.test.ts` 5). 188 pass overall.

Verified in the running app: the HEREZE timeline opened with *You have written 2 notes about HEREZE,
from Today to Today*, its recent notes and its recurring themes above the change block and the week
band; asking why a note was bound for `Prod` answered *you usually put Next and prod notes there*
followed by the two notes that argued for it; Organize showed 13 of 14 moving, sending one note
elsewhere moved that note and left the other twelve exactly where they were, and File 13 emptied the
Inbox to the single note that was staying put.

**Fixed while verifying:** re-assigning one note in the plan reset every other note to "staying in
the Inbox" — the plan was rebuilt from an override map that had never been seeded, so only the note
just moved had an entry. `planFiling` now takes where a note is bound rather than a whole
`Destination`, and the map is seeded when the plan is made.

### Landing page (`apps/www`)
- A second Next app, static export, port 3001. No `@echo/*` dependency: the site has no database, no
  parser and nothing to compile from the domain. Its brand tokens are re-declared in its own
  `app/globals.css` rather than imported, so the app's chrome and the site's field move apart.
- The imagery is generated, not photographed: `components/engraving.tsx` draws six greyscale plates
  from loops (rays, latitudes, a spiral, a ruled field, a mesh, a wave) and `components/filters.tsx`
  prints them through an ordered 8x8 Bayer threshold (`feImage` + `feTile` + a discrete transfer)
  or a dot screen for halftone. Both colours come out of `feFlood` reading the same custom properties
  the page is painted with, so no filter or component holds a hex value.
- Motion is scroll-driven CSS (`animation-timeline: view()`): plate parallax inside the feature and
  platform cards, a reveal on each card, and a horizontal drift on the wordmark band. No scroll
  listener, no observer, no motion library, and all of it inside
  `@media (prefers-reduced-motion: no-preference)`. A browser without view timelines gets the
  finished state, which is the design either way.
- Film grain over the whole page: one turbulence tile, `mix-blend-mode: overlay`.
- One client component (`install-box.tsx`) for the tab state and the clipboard; everything else is a
  server component. Every claim on the page is something the app already does, and the only external
  link is the repository.

Verified: `bun run lint` clean, `bun run --cwd apps/www typecheck` clean, `bun run --cwd apps/www
build` exports three static routes. Read at 1440px and 390px, with no horizontal scroll on the phone
(the hero column needs `min-w-0` or the longest install command sets the page width), and the
platform card labels measure 5.6:1 against the brightest part of the plate behind them, display type
4.3:1.

### Landing page rebuild: demonstrations instead of feature cards
Critiqued at 23/40 (`.impeccable/critique/2026-08-27T00-17-54Z__apps-www-app-page-tsx.md`) and
rebuilt against it. The blue field, the dither engine, the mono micro-labels and the no-hex token
discipline stayed; the structure did not.

- **The page had no product in it.** Zero images, zero video, zero canvas. Thirteen SVGs, every one
  an abstract plate. A reader had to build the composer, the palette, the Inbox and the Related panel
  in their own head from prose. Six feature cards and a platform triptych are gone; four
  demonstrations replaced them, each one a piece of the running application: the composer parsing a
  note as it is typed, the palette pulling `notes about cache in HEREZE` apart into a project chip
  and `16 set aside`, `HEREZE` returning three `Deadlands` notes with the belief named and refusable
  underneath, and the Inbox plan naming the two notes that argued for `Prod`. Every string in them is
  one the running app produced, taken from the S1–S4 verification paragraphs above.
- **They are markup, not screenshots** (`components/panel.tsx` plus `components/*-demo.tsx`). The
  app's own surface tokens moved into the site's theme (`carbon`, `carbon-lift`, `quiet`, `faint`,
  `brand-lit`), so a demo is sharp at any density, repaints with the tokens and costs kilobytes.
- **Six paragraphs of body copy were set at 11px, uppercase, tracked 0.18em.** Measured, not
  estimated. All-caps removes word-shape, which is the strongest cue in fluent reading, and this was
  the most-read text on the page. Body copy is `prose-lede` / `prose-body` now: sentence-case sans,
  capped at 46ch and 62ch. `label` carries one to three words and nothing longer.
- **The terminal is the session, typing itself.** Three commands and what they answer, each line
  taking its own slice of one `view()` timeline, so it types as it is scrolled to and holds when it
  is read. It sits beside the copyable commands and the prerequisites it used to leave unstated:
  Bun 1.3, no `.env`, and the ~120 MB model that arrives once and only gates search by meaning.
- **The hero cannot be blank.** `.beat` and `.keys` are transitions out of `@starting-style`, not
  keyframes with a backwards fill: the declared state is the finished one, so a background tab whose
  document timeline is frozen, a print, or a headless renderer shows the hero rather than nothing.
  Verified in the running page: with every animation fast-forwarded, no element is left at opacity 0.
  `@media print` settles the rest, declared last in the layer rather than with `!important`.
- **The clipboard failure is no longer silent.** A refused `navigator.clipboard` write said nothing
  and left the button reading "Copy"; it now says so, in a live region, and points at the text.
- **Contrast is measured, not eyeballed.** Every text node on the page audited by compositing its
  colour over its real background stack in a canvas: 39 distinct pairings, zero below their WCAG
  threshold, lowest 4.69:1 at 11px. Four tokens moved to get there (`ink/70` and `ink/75` → `ink/85`,
  `brand/55` → `brand/70`).
- **Two-column layouts start at `lg`, not `md`.** At 768 the showcase grid was handing the text column
  249px, which is a 49px heading over a 30-character measure.
- **The hero's composer is a real box.** It types itself once and is then a textarea a visitor can
  write in: the word count, the task chip and the day chip all answer what is typed, through
  `components/note-signals.ts`, a short deterministic stand-in for `@echo/parser`, because the site
  has no workspace dependencies and cannot use the real one. A screenshot of a composer asks to be
  believed; a composer answers. Nothing typed is stored, sent, or lifted into page state. It grows
  with the writing through the replicated-content grid trick (`.grow`), so there is no
  measure-and-set effect and no observer, and its 17px type is above the threshold that makes iOS
  zoom on focus. Verified by driving it: 21 words with a task phrase and `tomorrow` gave `Task` +
  `Due tomorrow` and grew the box to two lines, a `- [ ]` prefix gave `Task` alone, a note with
  neither gave no chips, and empty read `0 words`.
- The examples are a working programmer's corpus now (caching in Payments, `k8s ≈ kubernetes`, a
  pooler note bound for Prod) rather than the author's own project names. The counts, chips and
  reason sentences keep the exact shape the app produced in the S1–S4 verifications; only the note
  titles changed.
- Done since: the hosted demo. `apps/web` is a static export with no server and no account, so it
  was a folder of files away from having a URL, and it now has one — `app.useecho.dev`, with the
  site itself on `useecho.dev`. That closes the largest conversion loss on the page: the primary
  call to action in the nav, the hero and the footer is **Open echo** rather than `git clone`, and
  running it yourself is offered one step quieter. Both URLs are written down once, in
  `apps/www/components/links.tsx`.

Verified: `bun run lint` clean, `bun run --cwd apps/www typecheck` clean, `bun run --cwd apps/www
build` exports the same three static routes. Read at 1440, 1280, 768 and 375 with no horizontal
overflow at any of them, and no console output.


### E1 — The writing surface
First of three passes over how a note is actually written. E2 is slash commands, E3 was folded in
here: "save notes as a file" is a copy on the way out, not a file the note lives in, which is a
palette command rather than a schema.

- **The caret was 1.79 times the height of its own text.** Measured, not guessed: 15.6px of type
  under a 28px line, because `leading-7` was chosen for `text-base` and the `sm:text-[0.975rem]`
  under it shrank the font without taking the line with it — Tailwind's arbitrary sizes carry no
  line-height. A textarea's caret is exactly its line-height, so the only lever is the ratio: the
  simpler mode writes at 17px on 1.55 now (1.53), which is what a page you write on wants anyway and
  clears the 16px floor that makes iOS zoom. The caret also takes the brand colour — a full
  line-height of pure white reads as a block, the same bar in blue reads as a cursor. The composer
  keeps its own type: it is a card with a prompt beside it, not a page.
- **The tab keys are a browser's tab keys**, because the strip looks like a browser's and looking
  like something is a promise. Ctrl T, Ctrl Shift T, Ctrl W, Ctrl Tab and Ctrl 1–9 (9 being the last
  one), in `editorShortcutFor` beside the app's own map so ⌘-versus-Ctrl is still answered once.
  They are claimed from the window, not from the writing surface, so Ctrl W works mid-sentence.
- **Ctrl W never closes the window.** Closing the last tab leaves a blank page — a keystroke should
  not be able to shut the application.
- **Only a tab with a note behind it is remembered as closed.** A blank tab has nothing to reopen,
  and a deleted note comes back through Ctrl Z carrying its own tab; reopening one here would be a
  tab pointing at nothing. Ten deep, its own `localStorage` key, and reopening takes it off the
  stack. Known and left: a reopened tab appends rather than landing where it was, because array
  order is the whole model and the session keeps no memory of position.
- **The preview takes the split's column** rather than opening a third. In a 960px window two notes
  and a rendering do not fit beside each other, so asking for one puts the other away — one boolean,
  and the grid that was already there.
- **It follows the caret, not the scrollbar.** `marked.lexer` gives the blocks, and `blocksOf`
  hands each one the line it started on by accumulating every token's `raw` — including the blank
  stretches, which are counted and then dropped. The block under the caret takes the same
  leading-edge marker the stream puts beside the row under the pointer, and scrolls itself into view
  only when the block changes, so typing inside one paragraph never drags the preview a pixel at a
  time. A pane scrolled away to read something else stays where it was put.
- **Nothing is ever handed to `dangerouslySetInnerHTML`.** The tokens are turned into React
  elements, so there is no sanitiser in front of the preview and nothing for one to miss: raw HTML
  in a note is shown as the characters that were typed. The preview is read-only in both
  directions — a task checkbox is `readOnly` and out of the tab order, because ticking a box there
  would be echo writing into the note behind the writer's back.
- **Save a copy** is one way and stays one way: nothing remembers where the file went, so editing
  one never touches the other. `saveCopy` branches on the host — a real save dialog and
  `writeTextFile` on the desktop, the download the browser already knows how to do on the web. Two
  Tauri plugins arrived with it (`dialog`, `fs`, scoped to `$HOME/**`) and with nothing else. It is
  in the palette whenever a note is open, and in editor mode's header.
- **Ctrl Z takes the words back, and it is one timeline with everything else.** The browser's own
  undo stack belongs to the textarea element, and this mode remounts that element under a new key on
  every tab change — so native undo was empty the moment you came back to a note, which is exactly
  when you reach for it. Measured that way before it was replaced. `modules/editor/history.ts` keeps
  a history per note outside React, 200 steps deep, and it outlives the mount: leave a note, come
  back, and what you erased is still one press away. A reload starts over, the way a text editor's
  does.
- **A step is a burst, not a keystroke.** It breaks where a person feels one — after 450ms of quiet,
  when the change was larger than a character (a paste, a selection replaced, a stretch erased), or
  when writing turned into erasing. So one press takes back a word rather than a letter, and an
  erasure is always its own step. The caret comes back with the words.
- **Nothing outranks anything: the most recent thing wins.** A deleted note and an erased paragraph
  are two things that happened, so both sides carry a timestamp — `Undoable` gained `at`, stamped in
  `remember`, and `undoableAt(history)` answers for the words. The pane compares them and the later
  one is what the keystroke means. The old `undoClaimed` capture — "a note that just went owns Ctrl
  Z until you type" — is still what the full app uses, and is no longer a rule the simpler mode has
  to obey. Verified both ways round: write then delete gives the note back first, delete then write
  gives the words back first.
- **It says what it just did**, in the header, live, and re-announced when the same thing happens
  twice: *Took back — Deploy checklist*, *Put back what you erased*, *Took back what you wrote*,
  *Put it back*, *Nothing left to take back*. Named for what the writer did rather than for what the
  step does — being told "took back" while words appear on screen reads as a bug.
- Ctrl ⇧ Z and Ctrl Y put it forward again. Only the words have a way forward: nothing the app takes
  back can be put back by a keystroke.
- Tests: 26 new (`markdown.test.ts` 7 over lines, block offsets and the active block,
  `history.test.ts` 13 over step-breaking, walking, branching and depth, `session.test.ts` 3 over the
  closed stack, `save-copy.test.ts` 3 over filenames). 214 pass overall.

Verified in the running app with the desktop gate forced on: the writing surface measured at 17px
over 26.35px with a brand-coloured caret; a note holding a heading, a paragraph with bold, code and
a link, a task list, a quote, a fence, a table and a rule rendered as eight blocks at lines
0/2/4/7/9/13/17/19 — exactly the lines they occupy in the note — with the marker tracking the caret
across all of them; Ctrl T opened a tab, Ctrl 1 went back, Ctrl W closed and remembered it, Ctrl
Shift T brought it back and emptied the stack, and closing every tab left one blank writable page.
Undo was driven against a real corpus: three separated bursts came back one press each, a stretch
erased out of the middle came back whole, the history survived a tab change and back — the thing
that was broken — and interleaving a delete with an edit walked the merged timeline in both orders,
naming each step in the header. In the full app the palette's "Save a copy as a file" produced a
blob download named `Pooler note for the export check.md`. `bun run build` still exports the same
five static routes.

**Fixed while verifying:** marked keeps a `checkbox` token in a task item's own tokens as well as
flagging the item, so every checklist line rendered its `[ ]` twice — once as a box and once as the
characters.

**Not verified here:** the desktop half of "Save a copy". The dialog and filesystem plugins are
registered and permitted but have never been through a real `cargo build` — that needs
`bun run dev:desktop`.

### E2 — Slash commands
A `/` menu in both writing surfaces. Notion's gesture over echo's material: choosing a heading writes
`# `, not a style — so a note is still the characters somebody typed, survives being copied out or
exported to a file, and there is no second representation to keep in step with the words.

- **`shared/lib/slash.ts` is the whole of it, and it is pure.** The command list, reading what has
  been typed after a `/`, matching it, and applying it. No React, so it is tested directly.
- **A `/` only opens the menu at the start of a line or after a space.** Mid-word it is a date, a
  fraction or a path — `06/08`, `packages/core`, `and/or` — and a menu over those is a menu in the
  way. A space closes it, because `/n something` is a sentence; `/due` and `/category` are the two
  exceptions, and only for the rest of that line.
- **Matched on the start of a word, never inside one.** On a substring `/h` offered the divider and
  the to-do, because both happen to contain the letter. Keywords carry both languages, so `/titulo`
  finds the heading and `/tarefa` finds the to-do.
- **Nine commands write markdown** — three heading levels, to-do, bulleted and numbered lists,
  quote, code fence, divider. A prefix goes on the line wherever on it the command was typed, and
  asking twice does not stack `## ` under a `# `. A fence puts the caret on the empty line between
  its own backticks.
- **Three change what the note *is* rather than what it says.** `/task`, `/due <when>` and
  `/category <name>` take their own words back out of the note and leave the rest alone. `/due` reads
  its argument with `@echo/parser`, so `sexta` and `friday` both work, and the menu says what it read
  before the key is pressed — a command that quietly means nothing is worse than no command.
- **Enter chooses while the menu is open**, and the line under the composer says so for exactly as
  long as it is true. That is the one moment in that box where Enter does not send.
- **The menu never takes focus.** The caret stays in the words and typing keeps narrowing the list,
  which is the whole difference between this and a dialog. The surface lends it its accessibility:
  the textarea carries `role="combobox"` and `aria-activedescendant`, and the rows are listbox
  options that are pointed at rather than focused. It is a coss `Frame`, beside the caret —
  `shared/lib/caret-point.ts` lays the same text out in a hidden copy to find out where that is,
  because a textarea will not say.
- **The simpler mode files now.** Its rule was "nothing here files a task or a label"; it is now
  "nothing here *guesses*". A command is the writer saying so, and that has always been enough for
  echo to act — so `/task` in a pane writes the note first (a task cannot belong to a note that is
  not there yet) and then files it, and the header says which. `TaskService` gained `setDue` for the
  note that already had a task.
- In the composer nothing is stored before Enter, so a command sets an intent instead: a solid chip
  beside the read ones, one press from gone, merged with the reading at commit. A command beats a
  reading — `/task` files one whether or not the words look like something to do.
- A command is an edit like any other in the simpler mode: it goes through the same `edit` the
  keyboard does, so Ctrl Z reaches back past it.
- **A command that takes words asks for them rather than complaining.** Pressing Enter on
  `/category` is choosing the command, not filing an unnamed category — so it writes `/category `
  out in full and the menu drops into a second step: one row carrying what is being typed, and the
  strip below given over to what echo makes of it. `needsArgument` and `openArgument` are pure and
  tested; the strip says `↵ to name it` before the step and the reading after it.
- **Space takes the command too**, the way it does in a shell: naming one and reaching for the next
  word is agreeing to it. Only while the command's own name is being typed — inside an argument a
  space is a space — and never on a bare `/`, which is somebody writing a slash rather than choosing
  whatever happens to be first.
- **The list is in two halves**, `Write` and `This note`, which is the split the commands actually
  have: what goes into the words, and what happens to the note. Rows carry the icon in a tinted box
  so the current one reads at a glance, and the markdown each one writes stays on the right.
- Tests: 22 new in `slash.test.ts` over opening, closing, matching, applying and the second step.
  236 pass overall.

Verified in the running app, full mode: `/` opened the twelve commands with `aria-expanded` and
`aria-activedescendant` set; `/h` narrowed to the three headings and ⌄ + Enter wrote `## ` without
sending the note; Escape closed the menu and left the text; `/due friday` read *Due Tomorrow* under
the list and filed a `Task` + `Tomorrow` chip; `/category deploy notes` read *New category — deploy
notes*, and sending the note created the category, tagged it, and put the task in Tasks as *ship the
parser · Tomorrow*.

**Not verified: the simpler mode's half.** The menu, `/task`, `/due` and `/category` in an editor
pane are written and typecheck, but the dev server died mid-session (`write EPIPE` in its own log,
unrelated to this work) and they have not been driven. That is the next thing to look at.

### P8a–P8e — Language and arrival
Spec: `docs/superpowers/specs/2026-08-27-language-and-arrival-design.md`. Phase 7 (sync) is still
ahead of this; nothing here waits on it and nothing here pretends it is done.

**P8a — the application speaks two languages.** `apps/web/shared/lib/i18n/`: `en.ts` is the
specification, `pt.ts` is annotated against it, and `copy()` reads whichever is active. 275 keys.
`bun run typecheck` **is** the translation completeness check — a key added to English and not
answered in Portuguese does not compile — so there is no message compiler, no extraction step and no
runtime dependency. A value that varies is a function returning the finished sentence, which is what
lets `notas assim vão para Trabalho/Auth` put the folder where English puts the verb.

Three structural changes, not substitutions:
- `packages/search/src/context.ts` `explainContext` returns `ContextReason` codes instead of English
  clauses. A package with no React in it has no language in it either.
- `modules/inbox/plan.ts` `reasonsFor` returns `InboxReason` structures; the row says them, and joins
  the concepts with `Intl.ListFormat` rather than `" and "`.
- `learned.tsx` had a subject and a predicate glued at the render site. It is one whole sentence now,
  with `lit()` finding the reader's own words inside it wherever the language put them.

Also: `Count` takes a `describe(count)` rather than a noun to paste onto a number; `time.ts` takes
the locale and its format tokens from `i18n/locales.ts`, because Portuguese puts `de` between the day
and the month; `slash.ts` and `commands.ts` keep bilingual match keywords, since a reader who set the
interface to Portuguese may still reach for `search`. The language is decided before anything paints
by a blocking script in `layout.tsx`, the same trick `MODE_ON_OPEN` already used, and `<html lang>` is
the single source of truth React reads back on mount.

The shell is keyed on the locale. Six components are `memo()`d and their props do not change when the
words do; without the remount a reader would be left looking at rows in the language they just left.

**P8b — the site is two documents.** No `app/layout.tsx`: `app/(en)/` and `app/(pt)/` are route
groups with nothing above them, which is the only way each document declares its own `<html lang>` in
a static export. English keeps `/`, Portuguese is `/pt-br`, both emit `hreflang` for each other and
`x-default` for the root. Content is data in `content/{en,pt}.ts` handed down as props — and, unlike
the app's dictionary, it may not hold functions, because it crosses into `install-box.tsx`, which is
a client component. No detection redirect: the other language is a link in the nav and the footer,
written in the language it leads to.

**P8c — settings.** A sixth destination, and the rail's disabled button made real. Language, storage,
appearance, motion, what echo has learned, export, reset, the shortcut map, and what this build is.
`preferences.ts` grew a typed `Choice` store over the same synchronous `localStorage`, keys named as
Phase 7's `user_preferences` will name them. **Light mode is real**: the palette was already at
`:root` and the theme is the `.dark` class, so it was tokens rather than a redesign. The version is
read at build time from `apps/desktop/src-tauri/tauri.conf.json`, which is the one file that declares
it.

**P8d — arrival.** A first run that asks two questions and stops (language, and storage with sync
shown honestly disabled), a tour of coach marks over the real interface, and a five-item checklist at
the foot of the notes panel.

The rule underneath all three: **nothing keeps its own idea of progress.** Four of the five
milestones are read back out of the notebook (`onboarding/progress.ts`), so a reader who wrote notes
before any of this shipped opens the app to a list that is already finished. The fifth, `found`, is
the named exception — nothing in the database records that a search was run — and it is written down
when a search actually answers.

The tour advances when the reader does the thing, watched on the same milestones. It points at
controls by a `data-tour` attribute, so no component knows it is being explained, and the light is
one fixed element with a `100vmax` shadow ring and no pointer events, so what it is lighting stays
clickable. Escape ends it from anywhere. Next is there for the one step that is not the reader's to
force.

**P8e — identity.** The dither and the burst plate crossed into the app
(`shared/_components/engraving.tsx`), a deliberate second copy for the same reason the two
`globals.css` files re-declare the brand values. `docs/DESIGN.md` records the bounded exception: the
arrival surfaces are the one place inside the application where the loud half of the brand is used,
because they are seen once.

Verified in the browser: the app negotiated Portuguese out of the browser on first load and rendered
every screen in it; switching to English in settings repainted the whole tree with no reload; the
theme flipped both ways and survived a reload; the greeting appeared once and only with an empty
notebook; writing `Falar com a Ana sobre o deploy até sexta` advanced the tour from step 1 to step 2
and ticked the checklist to 1 of 5; the spotlight travelled to each anchor; replaying from settings
resumed at step 2 rather than re-teaching step 1. Both site documents build, and neither scrolls
sideways at 375px.

Verification: `bun run typecheck` (13/13) · `bun run lint` (clean, 293 files) · `bun run test`
(57 app tests, 21 db tests) · `bun run --cwd apps/web build` · `bun run --cwd apps/www build`
(`index.html` + `pt-br.html`).

### MCP — echo as something an assistant can use

A door other programs can knock on. The desktop app serves MCP over loopback HTTP, so whatever
assistant the reader already runs on this machine can search, read and write their notes through
tools echo defines, without echo shipping an AI of its own or asking for an API key. Nothing about
the no-AI promise moves: echo still does not call a model to work, and the reader still chooses
whether any of this is switched on.

**The shape is forced by where the notes are.** PGlite lives in IndexedDB, which no second process
can open and would corrupt if it could — so the server runs inside the desktop process and every
call it accepts is forwarded into the webview. `src-tauri/src/mcp.rs` is transport and nothing else:
it knows a tool has a name, a description and a JSON Schema. `apps/web/shared/lib/mcp.ts` holds the
tools, because that is where the domain is. Adding one is an entry in `TOOLS` and no Rust at all.

**The registry is pushed up, not pulled down.** `initialize` carries the server's instructions and
rmcp's `get_info` is synchronous, so it cannot wait on a webview. The web app publishes its
instructions and tool list through `mcp_ready` at startup and after every reload; the Rust side
holds the last copy and answers from it.

**Twenty-two tools, the full surface.** Notes (search, list, read, create, update, archive, delete),
folders, categories, tasks, what the notes say about this week, and what echo has learned. Each
input schema is generated from the zod schema beside it, so what a caller is told and what is
actually enforced cannot drift apart. The server's `instructions` field is where echo says what
these notes *are* — one person's own thinking, in their own words, search before you write, capture
their words rather than a summary of them.

**What an assistant may not do is the interesting half.** `observations` and `learning.record` have
no tools and will not get them: both are a record of what the reader themselves did, every learned
rule is measured against them, and an assistant writing there would invent attention nobody paid
with no way to tell the invented rows from the real ones afterwards. Categories assigned over MCP
are recorded as `auto`, so rule 9 still holds and the reader's own label always wins. Deleting is
guarded in the tool rather than in the advice — a note must be archived first, a folder must be
empty — because MCP's annotations are hints a client is free to ignore. `docs/ARCHITECTURE.md` rule
12 is where that now lives.

**Three guards on the port.** Loopback bind, `Host` and `Origin` validation, and a bearer token kept
at `0600` in the reader's config directory. A local port is not an authentication boundary: every
other process on the machine can reach it. Off until the reader turns it on in settings, remembered
across launches, and always on the same port — `127.0.0.1:4319`, declared in
`apps/web/shared/lib/mcp.ts`. An assistant is configured once, so an address that moved between
launches was an address that was wrong by the next morning; the cost is that a held port is a
failure the reader is shown by name rather than a silent move to somewhere nobody is looking. The
settings screen copies the address and the token to the clipboard and never prints the token,
because a settings screen is a thing people show other people.

Verification: `bun run typecheck` (13/13) · `bun run lint` (clean) · `bun run test` (8 new tests
covering the schemas, the two delete guards, and the absence of the observation tools) ·
`cargo test` (5 new tests covering the token comparison, the annotation passthrough and the shape
of what reaches a caller). Connected to from a real client: the handshake, the instructions and all
twenty-two tools arrived, and the reads answer — after the fix below.

### Release pass — the corpus it will actually meet, and the builds it ships as

A perf and issues pass against a seeded ten-thousand-note corpus, plus the release engineering the
READMEs already promise. `apps/web/scripts/bench.ts` is the measurement: it seeds a corpus straight
through SQL, times every operation the interface performs against it, and is the perf pass Phase 8
held open. Run it with `bun --cwd apps/web scripts/bench.ts 10000`.

**Fixed — the note list was capped at two hundred.** `NoteRepository.list()` defaulted to
`limit: 200` and `app/page.tsx` never passed one, so an install past two hundred notes silently held
the most recent two hundred: search scanned a truncated corpus, the Inbox counted a truncated pile,
the stream drew a truncated history, and nothing on screen said so. Every other repository here
already listed everything it had. Now so does this one, and a caller that wants a page says how big
— `mcp.ts` and the phrase model already did. 239ms for ten thousand notes against 22ms for two
hundred, which is the whole price of the fix. `repositories.test.ts` stands against it coming back.

**Fixed — triage froze the tab.** The Inbox worked out a destination for every unfiled note in one
uninterrupted loop, and one destination is a scan of every vector the reader has. At ten thousand
notes with nineteen hundred unfiled that was 17.5 seconds during which nothing on screen moved —
rule 8 says inference never blocks the editor, and a screen that cannot be scrolled is the same
broken promise. Three things were wrong and all three are fixed:

- `retrieval.destinations` built a map of the whole corpus **inside each call**, so the Inbox was
  quadratic in a corpus it only ever read one way round. It takes a `folderOf` lookup now and the
  caller arranges it once: 17.5s → 13.0s before anything else changed.
- The pass now runs in slices of sixteen with a real yield between them (`MessageChannel`, because
  awaiting a resolved promise yields to the microtask queue and not to the browser), publishing what
  it has as it goes. The same total work, none of it in one frame, and rows fill in behind the
  reader instead of all at once at the end.
- It resumes. Filing a note changes the pile, which restarts the effect — so the pass was being
  undone by the gesture it exists to make cheap, and on a large Inbox would never have reached the
  end. Answers are kept against the note and the destination rules they were worked out for.

**Fixed — every Inbox row answered "why?" before anyone asked.** `details` hides its children rather
than leaving them out, so the reasons were computed for every row on every render, and each one read
every note in the suggested folder through two linear scans of the corpus. The reasons are worked
out on the press now, and the two scans are a `notesById` and a `notesByFolder` index the screen
keeps anyway. `InboxRow` is memoized to go with it — the suggestions arrive a slice at a time, so
the pile is re-rendered many times over while the pass runs, and a row whose own answer has not
changed has nothing to redraw. It takes its position as a prop rather than a closure over it,
because a closure built during render is a new prop every time and the memo would never hold.

**Fixed — the service worker pinned its runtime for ever.** The cache was named `echo-v1` and never
changed, and `activate` deletes every cache that is not the current name — which was a no-op while
there was only one name. Next's chunks are content-addressed and update themselves, but
`/pglite/pglite.wasm` and `/ort/*.wasm` keep their names, and `asset` answers from the cache before
the network. A reader who installed echo once would have run that build's WebAssembly against every
build after it. The page registers `/sw.js?v=<version>` now and the worker names its cache after
what it was registered with, so a release replaces both itself and what the last one kept.

**Releases.** `.github/workflows/check.yml` runs `typecheck`, `lint`, `test` and `build` plus
`cargo fmt --check`, `cargo check` and `cargo test` on every push and pull request. `release.yml`
builds the desktop app on a tag: NSIS `.exe` and `.msi` on Windows, a `.dmg` per architecture on
macOS, `.deb`/`.rpm`/AppImage on Linux, all onto one draft release. `bun run bump <version>` writes
the number where it is declared and prints the tag to push.

**The Linux glibc floor is 2.39, and it is ONNX Runtime's number rather than ours.** A `.deb` built
on a current Ubuntu installed on a friend's Debian and refused to start: `libm.so.6: version
GLIBC_2.43 not found`. glibc is backward compatible and not forward compatible, so the version a
binary links against is the *oldest* it will ever run on — building on your own machine produces a
package for your own machine.

The obvious answer was the oldest runner, `ubuntu-22.04`, glibc 2.35. It does not link. `fastembed`
pulls ONNX Runtime in as a prebuilt static library compiled against glibc 2.38, so it calls
`__isoc23_strtol` and libstdc++'s `_M_replace_cold`, neither of which exists on 22.04, and the build
dies at the linker. `cargo check` said nothing — it never links — and `cargo test` found it, which
is the second time this week the check workflow earned itself.

So Linux builds on `ubuntu-24.04` and the floor is 2.39. **Debian 12 is under it and cannot run
these builds; Debian 13 is over it.** That is a constraint the embedding runtime imposes, not a
choice, and the way out is supplying an ONNX Runtime built against an older glibc — the official
releases are manylinux — through `ORT_LIB_PATH` rather than the one ort downloads. Worth doing if
anyone actually asks for Debian 12. The `glibc floor` step reads the built binary's symbols back and
fails the release if they exceed 2.39, so the next time this is wrong it is a red build rather than
a message from somebody's friend.

**Two things broke the first release run, and both had been sitting there since the icon generator
landed — the desktop build had not been run since.** `cargo check` in `check.yml` catches both, which
is the argument for that workflow existing at all:

- **Every icon was RGB, and Tauri requires RGBA.** `tauri::generate_context!` is a proc macro, so
  this failed at compile time on every platform — "icon 32x32.png is not RGBA" — not at bundling.
  The drawing is opaque, so Chromium's screenshots carry no alpha channel at all. `omitBackground`
  would give one by making the brand field transparent, which is a different icon; the field is the
  icon. `scripts/icons.mjs` undoes the PNG filters, adds an opaque channel and re-encodes. Checked
  against Chromium's own decoder rather than against the code that wrote them: 1.4 million pixels
  across five sizes, none changed, alpha 255 everywhere.
- `PathBuf` was imported at the top of `src/lib.rs` and used only inside `#[cfg(test)]`, so every
  non-test build warned. Moved into the tests module.

`icon.icns` is generated now, and was the thing that would have failed the macOS build next: it was
missing, and the macOS bundler is the only one that wants it. `scripts/icons.mjs` writes it the same
way it already wrote the `.ico` — a container of PNG payloads, built rather than fetched from
`iconutil`, so a format only one of three operating systems can produce does not leave the macOS
build depending on which machine ran the generator. Regenerating produced byte-identical PNGs, which
is the check that the change is additive.

### Icon and site pass

**One drawing, everywhere.** The generator used to pick a flat silhouette under 64px and the screened
orb above it, which is why the desktop taskbar icon looked nothing like a browser tab. Which drawing
is used is no longer inferred from the size — there is one, and it is the dithered orb. The small
sizes tighten the ladder instead: a one-pixel Bayer cell, six heavy latitudes with a thicker rim, and
a painted ground rather than a screened one, because screening a black field leaves one ink cell per
8x8 tile, which is a halftone at 512px and eight specks in the margin at 64.

**Both favicons are the desktop application's `.ico`, byte for byte.** `apps/web` shipped a single
512x512 PNG for a 16px slot and let the browser resample it, which turns a dither into grey;
`apps/www` shipped the flat SVG, so the site and the app in the taskbar were two different drawings.
Both are now `app/favicon.ico`, written by `scripts/icons.mjs` from the same size list the bundle
uses. `apps/web/app/icon.png` and `apps/www/app/icon.svg` are gone, and with the SVG went the last
caller of the flat drawing.

**The tour's third panel is the desktop application.** `Timeline` is replaced by `Native` in
`components/tour.tsx` and both content files: the same notes in a window of its own, with tabs and
the simpler mode. `public/shots/native.webp` is cut from a 2559x1398 capture to the 2290x1760 every
other shot is cut to — `components/shot.tsx` writes those numbers down once for all of them, so a
file at another ratio makes the browser reserve the wrong box and the page jump. The timeline shot
stays in both READMEs, which still show it.

## In progress
- **E2's simpler-mode half is unverified.** Written, typechecked, and never driven — see above.
  Still open from Phase 5: whether projects should be their
  own entity — the brief is the first thing in the product that treats a folder as a project, so
  that decision has evidence behind it now rather than only a shape.

## Next
1. **You:** run `bun run dev:desktop` and look at it. The binary builds and stays up, but nobody has
   seen the pixels — in particular whether PGlite's WebAssembly and the model runtime behave the same
   under WebKitGTK as they do in Chrome, and whether "Save a copy" reaches a real save dialog now
   that the `dialog` and `fs` plugins are registered. Still open from Phase 5: whether projects
   should be their own entity.
2. **Then Phase 7 — Sync:** the change-log protocol, a Postgres server running the same migrations,
   explicit conflict handling, and auth. It is the biggest chunk in the spec and delivers nothing
   until it is finished, so it goes last before polish.

## Decisions made
| Date | Decision | Why |
|---|---|---|
| 2026-08-25 | bun workspaces instead of pnpm | user directive |
| 2026-08-25 | Biome instead of ESLint + Prettier | user directive |
| 2026-08-25 | Turborepo kept | user directive, spec §3 |
| 2026-08-25 | Product is **echo**, lowercase in prose and UI | user directive; tagline: open source, no-AI note taker that learns with you |
| 2026-08-25 | Multilingual embeddings (`multilingual-e5-small`, ~120MB, 384-dim) | notes in pt-BR and any other language; English-only model rejected |
| 2026-08-25 | Plain textarea editor in Phase 1, rich editor later | capture speed first; Notion-style editor is a later upgrade |
| 2026-08-26 | Landing page is its own app, `apps/www` | the site deploys, breaks and gets rebuilt on its own schedule; the app should not ship a marketing bundle, and the site should not compile a database |
| 2026-08-26 | Site imagery is generated SVG, dithered by filter | a folder of engravings would be megabytes and would resample; a plate drawn from a loop prints at the size it is shown |
| 2026-08-26 | Parallax is `animation-timeline: view()`, not JavaScript | the compositor already knows where an element is in the viewport; a listener would only re-derive it, and reduced-motion is one media query away |
| 2026-08-25 | Bun's isolated node_modules linker (default in 1.3) | left as-is; Next builds fine under it |
| 2026-08-25 | coss installed into `apps/web`, not `packages/ui` | only one consumer exists; promoting a primitive is a move, not a rewrite |
| 2026-08-25 | Instrument Serif as the display face | free, high-contrast didone; a licensed face swaps in with one line in `layout.tsx` |
| 2026-08-25 | App is dark-only for now | both app references are dark; light mode is a token swap later |
| 2026-08-25 | Plain `nav` rail instead of coss `Sidebar` | the rail never expands and has no mobile sheet yet; `Sidebar` returns if that changes |
| 2026-08-25 | Drizzle ORM (user directive) | typed queries over one schema definition; drizzle-kit generates migrations |
| 2026-08-25 | Migrations inlined into TS by a script | browsers have no filesystem; regeneration beats hand-copying |
| 2026-08-25 | `bun test` instead of Vitest | same API, zero dependencies, runs real PGlite |
| 2026-08-25 | Schema grows per phase (`folders`, `notes` today) | tables nobody reads are speculative; `workspace_id` is already everywhere |
| 2026-08-25 | Note title derived from first meaningful line | capture must never demand a title dialog |
| 2026-08-25 | Folder deletion returns notes to the Inbox | notes are the user's; organization is not |
| 2026-08-25 | Composer + Enter to commit, no "New" button | capture must be felt, not clicked; nothing is stored until the writer commits |
| 2026-08-25 | Next static export (`output: "export"`) | user directive; the whole app is client-side, so a server only adds hydration risk |
| 2026-08-25 | No view-transition morph between composer and note | tried and dropped on request; the swap stays instant |
| 2026-08-25 | Saving stays on the composer, with an inline alert offering "Continue" | writing sessions are usually a burst of separate thoughts; opening each note would interrupt the next one |
| 2026-08-25 | Stream view after the first capture, sidebar hidden there | writing is a burst of separate thoughts; the stream keeps them in view without turning into a second list |
| 2026-08-25 | Saved-confirmation alert removed | the stream shows the saved note itself; a confirmation on top of it was noise |
| 2026-08-25 | FLIP for the composer's travel, not View Transitions | the element is re-created in a different subtree, and FLIP works everywhere without a fallback path |
| 2026-08-25 | No React context, no custom hooks | one owner component and props are enough at this size; state managers stay out until something actually needs them |
| 2026-08-26 | Learned rules derived on read, never stored | one place a belief about the reader can live, so "forget this" is a delete rather than a flag something else might still consult |
| 2026-08-26 | Vectors held in memory for the session | they are derived, bounded by the note count, and re-reading them per query was the most expensive thing the app did |
| 2026-08-26 | Vectors stored as `bytea`, old table dropped | half the storage and half the read time; derived data may be rebuilt rather than migrated |
| 2026-08-26 | Full-text search via a generated `tsvector` + GIN | 60x on the query that runs most often; the database keeps the index in step with the note |
| 2026-08-26 | Search answers in two passes, words then meaning | a local app must answer immediately; the model is allowed to be late and never allowed to block |
| 2026-08-26 | Production builds use webpack, dev uses Turbopack | Turbopack miscompiles PGlite's runtime module and the app cannot open its database; dev is unaffected |
| 2026-08-26 | PGlite's wasm served from `public/pglite` | the same arrangement as `public/ort`; a local-first app serves its own runtime rather than having a bundler assemble it |
| 2026-08-26 | `⌘Z` takes back the last capture | commit is one keystroke with no confirmation, which is only fair if undo is one too |
| 2026-08-26 | Destinations are suggested by neighbour vote, not a classifier | the corpus is the model: every note the reader files improves it, nothing is trained, and the reason is a list of notes rather than a score |
| 2026-08-26 | Corrections may only damp a destination, never invent one | filing a note is already the positive signal — it adds a voter — so history is a second opinion and the notes stay the evidence |
| 2026-08-26 | A task is created only where the writer agreed to the chip | the parser proposes and the reader decides; a task echo invented would be a list item it could not explain |
| 2026-08-26 | Projects deferred, not built | today a project would be a folder with a different icon; the domain is ready when the product has something to say about them |
| 2026-08-26 | The tree and the note list are one component | a drag crosses between them, and the row it is heading for must light up mid-air |
| 2026-08-26 | Mobile is CSS, not a second tree | one note list in the document, one drag target, and no guess about the viewport before the browser has said what it is |
| 2026-08-26 | Service worker precaches nothing | the app loads all of it on the first visit anyway; a precache list would download 13MB before the first note |
| 2026-08-26 | The document is network-first, everything else cache-first | a stale shell would pin a reader to an old build; hashed assets never go stale |
| 2026-08-26 | The project brief is derived on read, never stored | a description that has to be maintained is a description that goes stale; this one is either right or the notes are |
| 2026-08-26 | Organize shows the plan before it moves anything | filing fourteen notes wrongly is a far worse afternoon than filing them one at a time; undo is not the same promise as never having done it |
| 2026-08-26 | "Why?" answers with a habit and named notes, never a score | a reason you can open is a reason you can disagree with |
| 2026-08-26 | Extracted filters narrow rather than re-order | "from last month" has to mean something; it is only fair because every filter is a chip one press from gone, and the row says how many notes it set aside |
| 2026-08-26 | Meaning dropped from 0.55 to 0.45 to make room for context | a note can be almost exactly about the same words and still be the wrong note; belonging can pass seventeen points of meaning and no more |
| 2026-08-26 | `note_opened` in `observations`, not `learning_events` | which notes are read together is a fact about how the reader works, not an opinion about anything echo inferred |
| 2026-08-26 | No `type:` filter | notes are the only thing the palette searches; the chip would be decoration until tasks are searchable |
| 2026-08-26 | Aliases decided by near-exclusive usage, not by similarity | measured on a real corpus the noise cosines higher than the true pairs; what makes a synonym is that the reader writes it *instead*, so the two hardly ever share a note |
| 2026-08-26 | No aliases for a word in fewer than three notes | two notes is not a profile; on thin data half the vocabulary keeps the same company and no threshold tells the half apart |
| 2026-08-26 | Opposites read as substitutes, accepted | separating them needs something that knows what words mean; the claim on screen is "you may also mean" and one press refuses it |
| 2026-08-26 | Concepts sit beside categories rather than replacing them | a category is the reader's stated word and still outranks anything inferred; a concept needs nothing created before it is useful |
| 2026-08-26 | `alias` and `concept` rules skip the CONFIDENT threshold | they are not inferred from a correction, they are the correction — a refusal that cannot be seen cannot be undone |
| 2026-08-26 | Temporal mentions stored as `jsonb` on one row per note, not a normalized table | the "now" band is one pass over a small table when a view opens, never per keystroke; a note with no dates still needs a row, which is what stops chrono re-reading it forever |
| 2026-08-26 | Visits live in `observations`, not `learning_events` | rules are derived from corrections; walking around the app must not teach echo things nobody said |
| 2026-08-26 | Anchors resolved in `@echo/core`, not in the parser | when a project started is a fact about the corpus, not about the note — and a name the corpus never heard is dropped rather than guessed at |
| 2026-08-26 | `naquela época` deliberately unread | unanchored: it names no span, and a span echo invented cannot be corrected |
| 2026-08-26 | Weeks start Monday | a working week is what someone means by "semana passada" when they are looking for what they wrote |
| 2026-08-26 | Tauri's Rust side is a window and nothing else | filesystem, notifications, tray and shortcuts arrive when a feature asks; the domain lives in the web app either way |

## Open decisions
- Rich editor engine for the post-MVP upgrade (Tiptap/ProseMirror vs BlockNote vs Lexical). Not
  needed until after Phase 2.

### Phase 3 — Intelligence
- `@echo/parser`: deterministic, offline content analysis with no model and no API key.
  - Dates via **chrono-node**: `tomorrow` / `amanhã`, weekday names, `in two weeks`, day-first
    numerics (`03/12` is 3 December). Portuguese parses first so numerics stay day-first, English
    covers the rest, and one phrase never yields two dates.
  - Deadlines: a date framed as a limit (`before Friday`, `até sexta`, `by`, `prazo`) is a deadline;
    a mention is not.
  - Tasks: checkboxes score 1.0, phrasing scores lower and by how explicit it is — `TODO` and
    `fazer:` at 0.9+, `need to` / `preciso` / `tenho que|de` at 0.8, everyday intent
    (`eu quero fazer`, `want to`, `devo`, `must`, `agendar`, `falta`) at 0.6–0.65, and bare
    narration-shaped futures (`vou`, `I'll`) at 0.55 with `vou ser`/`I will be` excluded. Order in
    `INTENT_MARKERS` is precedence: the first pattern a line matches wins, so explicit spellings sit
    above everyday ones. Every marker files its corrections under a written-down trigger name, so
    one rejection takes the whole phrasing back out. Nothing mutates the note.
  - Keywords: frequency ranking with English + Portuguese stopwords, ties broken alphabetically so
    the same note always parses the same way. `now` is injected for determinism.
  - 9 tests covering both languages, deadline vs mention, invalid dates, everyday task phrasing
    against narration, and reproducibility.
- `@echo/embeddings`: `Embedder` interface (`embed` / `embedMany` / `embedQuery`) plus a local
  runtime — `Xenova/multilingual-e5-small` through transformers.js, so notes in any language land in
  one space. The ONNX runtime is **served by the app itself** (`public/ort`, synced by
  `scripts/sync-onnx-runtime.ts`), never a CDN. All eight build variants are synced — the runtime
  picks between the plain, jsep, asyncify and jspi builds at load time based on what the browser
  supports, and a missing one fails as "no available backend". Only the chosen pair is downloaded. The model runs in a Web Worker, so it cannot cost a
  keystroke. A failed load is forgotten rather than cached, so a dropped connection costs one retry.
- `@echo/search`: hybrid ranking — semantic 0.6, lexical 0.3, recency 0.1, coefficients as
  configuration. Recency halves every 14 days. `relatedTo` deliberately ignores recency: relatedness
  is about what a note is about. Lexical side is Postgres FTS with the `simple` configuration, so no
  language is privileged. 8 ranking tests.
- `@echo/core` analyzer: one pass at a time, driven by note events, queue derived from the database
  itself (`pending`), so a failure costs a retry and never a lost note. Awaitable — asking for a pass
  while one runs extends it instead of starting a second.
- Wired into the composer: as you type, outlined badges with a small colored dot report `Task` and
  `Due <word>`. Parsing rides `useDeferredValue`, so it runs after the keystroke, never in front of
  it — on a 5,400-character note that took the per-character cost from ~5.7ms to ~2.6ms.
  Local, synchronous, nothing to wait for. Only deadlines get a chip — a date merely mentioned stays
  silent, because one good suggestion beats three noisy ones.
- The intelligence panel is now **Related**: the notes closest in meaning to the open note or to
  what is being written, with a match percentage, debounced 400ms behind the keystroke. It says when
  it is still reading, and says plainly when the model could not load instead of looking empty.
- Panel preferences (notes, intelligence) persist in `localStorage` under `echo:*`. Both panels
  render **closed**, matching the prerendered markup exactly, then animate open to the stored
  preference on mount (width + opacity, 260ms). Nothing jumps on first paint; the panels arrive.

### Phase 4 — Adaptive learning
- `@echo/learning`: corrections in, rules out, as pure functions over an event list. Weight decays by
  half every 30 days, so a reader who changes their mind is followed rather than argued with. One
  correction lands at 0.5 confidence, two at 0.67 — confident, never certain, and nothing is claimed
  as learned below 0.6.
- Rules are **derived on every read, never stored**: deleting the events behind a rule is the only
  way it exists, which is what makes "forget this" a real promise instead of a hidden flag.
- Wired through the product: a learned rule can quiet a signal the parser found but never invent one,
  a dismissed duplicate never comes back, and opening a search result feeds `interactionScore` —
  weighted smallest on purpose, enough to break a tie and never enough to outrank an answer.
- The intelligence panel's **Learned** section says what echo has worked out in the reader's own
  words, with an undo on each line. Every signal chip carries a "why", phrased as the phrase that
  gave it away plus how often the reader has agreed.

### Performance pass — measured, not assumed
Benchmarked against real PGlite with a generated corpus. Before → after, per interaction:

| Path | 2,000 notes | 10,000 notes |
| --- | --- | --- |
| Lexical search (per query) | 376ms → **5ms** | ~2s → **21ms** |
| Related notes (per pause in typing) | 448ms → **2ms** | ~2.3s → **8ms** |
| One palette search, end to end | ~820ms → **~7ms** | — → **~30ms** |
| Note list refresh (per autosave) | 7ms → **0ms** | 14ms → **0ms** |

What changed:
- **Full-text search is an index, not a scan.** `notes.search` is a stored `tsvector` generated by
  the database from the note itself, with a GIN index over it. Title carries weight A and body B, so
  a note *about* the question outranks one that merely mentions it. The last word of a query is a
  prefix match, so results keep up with typing rather than catching up.
- **Vectors are resident.** `createVectorIndex` (`@echo/search`) holds every embedding in one
  contiguous `Float32Array` and compares in place — no allocation per candidate, no round trip. It is
  filled in the background after the notes are on screen, and patched as each vector is written, so
  it is never re-read.
- **Vectors are stored as bytes** (`note_vectors`), not a Postgres array of reals. Reading ten
  thousand went from 2.2s to 1.3s and the storage halved. The old table was dropped rather than
  converted — derived data is the one thing a migration may throw away.
- **The note list is applied, not reloaded.** Domain events patch the array in place. Every autosave
  used to re-read the workspace and replace the array, which re-rendered every row in the stream.
- **Search never scans the corpus.** Each half nominates up to 60 candidates and only those are
  ranked; `rank()` now blends precomputed scores and no longer touches vectors at all.
- **The stream stops paying for what is off screen** (`content-visibility: auto`), and each row is
  memoized, so moving the pointer down the column re-renders two rows rather than the notebook.
- **The analyzer embeds in batches of 8** rather than one note at a time, and publishes each vector
  as it is written.
- Selecting a note names its columns: the table carries a `tsvector` and `select *` would have
  returned a second copy of every note on the query that runs most often.

### Feedback pass — nothing hangs, nothing lies
- **Search runs in two passes.** Words come back from the index immediately; meaning follows when the
  model has answered, and the results re-order. Previously a single `Promise.all` awaited the query
  embedding — and a model that never resolved (a slow or blocked download) froze search completely,
  with no error and no timeout. Retrieval now refuses to wait on a model that is not ready.
- **The model download is visible.** `EmbedderStatus` (`idle | loading | ready | unavailable`) crosses
  the worker boundary with real progress, and the panel shows it: a hairline, a percentage, and one
  line saying it happens once and that everything else works meanwhile.
- **The Related panel's silence means one thing only.** Model loading, notes not read yet, a failed
  model and "nothing matches" are four different messages; before, all four were the same empty state.
- **Search results show why they matched** — the query's words marked in the title and in the line
  they appear on, rendered as text nodes rather than markup built from a note.
- **Capture is reversible.** `⌘Z` with an empty composer takes the last note back: it leaves the
  screen, leaves the database, and its words return to the composer with the caret where it was. The
  composer's metadata row names the shortcut for the moment it applies. Commit is one keystroke, so
  undo has to be too.
- A dead embedding worker now rejects its outstanding requests instead of leaving promises unsettled.

### Production build — it did not work before this pass
`bun run build && bun run start` produced an app that loaded and then could not open its database:
`TypeError: m.instantiateWasm is not a function`. Dev was fine, which is why it went unnoticed.

- The cause is Turbopack, not minification or `transpilePackages` — both were ruled out by
  experiment. Turbopack builds a namespace object for PGlite's internal runtime module whose
  `instantiateWasm` binding is never initialised. **Production builds now run through webpack**
  (`next build --webpack`); dev stays on Turbopack.
- PGlite's WebAssembly is served by the app itself from `public/pglite`, synced by
  `scripts/sync-pglite-runtime.ts` — the same arrangement `public/ort` already had, and the
  documented answer for bundlers that cannot follow PGlite's `new URL()` pattern.
- `@echo/embeddings` no longer re-exports its local runtime; it lives at `@echo/embeddings/local`.
  Importing the interface used to drag transformers.js, and through it a native `onnxruntime-node`
  binary, into every consumer's graph. Only the worker that runs the model needs it.
- `apps/web/tsconfig.json` excludes `out` and `.next`. Stale build output was being typechecked.

Verified in the built export: database opens, capture works, undo works, semantic search finds the
HEREZE note from "merchant inventory", results are highlighted, and the model download reports
progress — with an empty console.

### Animation pass
Reviewed against Emil Kowalski's framework and corrected:
- The model progress bar animates `transform: scaleX` on a linear curve, not `width` on an easing
  curve — a progress report many times a second should not go through layout, and a bar that eases
  looks like a download speeding up and slowing down.
- Panel toggles are 180ms, not 260ms. They are bound to a keystroke pressed all day.
- Press feedback on every hand-rolled control (note list, related notes, editor back). The coss
  `Button` already depresses via its shadow; these had nothing.
- The composer's save button splits its timings: 200ms to arrive, 120ms to answer a press. The
  entrance is opacity alone, so `transform` can mean "pressed" and nothing else.
- The arrival glow is cleared after it plays. Left set, re-entering the stream lit the row again and
  told the reader a note had just landed when it had been there an hour.

### Phase 5 — Organization
- **Schema** gains `tasks` (migration `0006`): id, workspace, `note_id` with `on delete cascade`,
  title, `due_at`, `completed_at`. A task always names the note it came out of, so a note leaving
  takes its tasks with it. Indexed on the note and on the due date.
- **`@echo/core`** gains `TaskService` (create / complete / reopen / set due / delete / list) and
  `task.created|updated|deleted` events, plus `tree.ts`: `buildTree`, `flattenTree`, `folderPath`
  and `subtreeIds` — pure, so the explorer never asks the database how to draw a level. Folder
  services already existed since Phase 1; this phase is what finally uses them.
- **`@echo/search`** gains `suggestDestinations`: where a note belongs, decided by where the notes
  nearest it already are. Each neighbour votes for its own folder weighted by similarity, unfiled
  neighbours abstain, and a folder below a third of the vote is a coincidence rather than a
  suggestion. No classifier, nothing trained, and `because` names the notes that argued — so "why
  there?" is answered with notes the reader can open, never with a score.
- **The vector index** gains `vectorOf`. A note that has already been read is its own query, so
  answering for a whole Inbox is a scan of memory rather than a hundred trips through the model.
- **The navigation pane is now the explorer**: Inbox at the top with a count, the folder tree under
  it with unlimited nesting, and the note list of whatever is selected below. The tree and the list
  are one component because a drag crosses between them.
- **Drag and drop**: notes onto folders or onto the Inbox, folders into folders. A folder cannot be
  dropped into its own subtree — guarded in the UI by `subtreeIds` and again in `folders.move()`.
  Every drop target is also reachable without a pointer: right-click a note for "Move to", and every
  folder row carries the same three actions from a `⋯` menu and from a right-click.
- **Folders are named in place.** The row turns into a text field — create at the root, create
  inside, rename. Enter keeps, Escape drops, and clicking away keeps rather than discards. Deleting
  a folder says, where the decision is made, that its notes go back to the Inbox.
- **Inbox triage** is one key per note. Each unfiled note shows its suggested destination, the
  evidence behind it ("3 notes like it are there"), and a menu for somewhere else. Filing one moves
  the keyboard to the next row's button, so a pile is worked through with Enter alone.
- **Learning closes the loop.** Accepting records `signal_accepted` on kind `destination`; filing it
  elsewhere records `signal_rejected` against what echo suggested. A rejected folder is damped by
  `adjust(1, rule)` — the same function that quiets a task phrase — and can never be promoted by
  history alone. The positive signal needs no machinery: filing a note *is* the evidence, because it
  becomes one of the neighbours that votes next time. Destination rules appear in the Learned panel
  named by path, and "forget this" deletes them like any other.
- **Tasks** exist only where the writer agreed. Accepting the composer's `Task` chip creates one at
  commit, with whatever deadline the parser found; nothing reads a note and decides on its own. The
  Tasks view groups Late / Due / No date / Done, links each task to its source note, and completes
  with a timestamp rather than a flag.
- **Rail and palette** caught up: Inbox (with a dot when notes are waiting) and Tasks are real
  destinations, `⌘⇧P` opens triage, and the palette gained "New folder", the Inbox and Tasks.
- The note editor now names where the note lives, quietly, beside the save state.

Verified in the production build, at `bun run start`: folder created and nested, note dragged into a
folder and sent back through the row's context menu, Inbox suggestion earned by one filed neighbour
and accepted, focus landing on the next row's button, a task created from an agreed chip and
completed, and all of it surviving a reload. No console errors.

**Projects, deliberately not built.** The plan listed "projects as first-class" here. Nothing in
echo today tells a project apart from a folder: no status, no deadline, no surface that treats one
differently. Building the entity now would mean a second tree, a second set of menus, a second
destination type in the vote and a second thing to choose between at capture — for behaviour a
folder already provides. The domain is ready for it (`folders` is one table with a parent, and
`workspace_id` is everywhere), so this is a decision to defer, not a corner cut.

### Structural pass
- `apps/web` is modules now: `app/` holds the route entry, the one owner component and its command
  list; `modules/<module>/_components/*.tsx` holds one component per file with the module's own
  types and pure helpers beside them; `shared/` holds only what more than one module needs. Modules:
  `capture`, `explorer`, `inbox`, `intelligence`, `notes`, `search`, `shell`, `tasks`. The coss
  registry keeps its own paths, which the CLI owns.
- Nothing is declared inside another component any more. Every nested component became a file —
  `signal-chip`, `note-row`, `stream-row`, `stream-stamp`, `folder-row`, `place-row`,
  `folder-name-field`, `inbox-row`, `task-row`, `rail-button`, `top-bar`, `palette-action`,
  `palette-note`, `marked`, `model-progress`, `duplicate-alert`, `note-list-skeleton`.
- Logic that was living inside components moved out to plain modules: `capture/signals.ts`,
  `explorer/model.ts`, `search/model.ts`, `tasks/sections.ts`, `notes/stream-selection.ts`,
  `shell/view.ts`, `app/commands.ts`.
- Shared instead of repeated: `Label`, `Count`, `Timestamp`, `EmptyState`, `folderPaths`,
  `stagger`, and the `quiet` / `numeric` class tokens.
- Arrow functions everywhere, including page and layout. Comments were cut back to the ones that
  record a decision, a measured number, a browser quirk or a `ponytail:` ceiling.

Verified after the move: `typecheck` 12/12, `lint` clean, `test` 6/6, `build` clean, and the
production app still opens its database, files a note from the Inbox and moves one from the tree.

### Phase 6 — PWA, mobile and desktop
- **Installable.** `app/manifest.ts` (force-static, because the app is an export) plus an icon set
  drawn from one source: a bright source dot with echoes fading outward. 192, 512, a maskable 512
  with the safe zone, an apple touch icon, and the Windows `.ico` for the desktop bundle.
- **Offline is the normal case.** `public/sw.js` is thirty lines and precaches nothing: the document
  is network-first so a stale shell can never pin a reader to an old build, and everything else is
  cache-first because it is content-addressed. Everything the app loads it loads on the first visit
  anyway, so this costs one visit rather than a thirteen-megabyte download up front.
- Verified by stopping the server and reloading: the shell, the database, the folder tree and every
  note came back, and a note written with nothing serving the app saved and stayed saved.
- **Mobile is not a shrunk desktop.** Below `md` the rail is gone and a bottom bar takes its place —
  Write, Search, Inbox, Tasks, Places — with the count as a dot and padding for the home indicator.
  The navigation pane becomes a sheet from the reading edge; the intelligence panel becomes a sheet
  that rises from the bottom, with its toggle moving into the top bar where the rail cannot reach.
  Both dismiss on a backdrop.
- The rearranging is CSS, not a branch: one tree, one note list, no guess about the viewport before
  the browser has said what it is. Only two things are decided in JavaScript — that neither panel
  opens over the writing on a small screen.
- **`apps/desktop`**: a Tauri v2 shell around the same `apps/web/out`. The Rust side is a window and
  nothing else, and the capability file grants `core:default` and nothing else. Filesystem paths,
  notifications, a tray and a global shortcut arrive when a feature asks for them — echo's database,
  search and learning all run inside the web app, so there is no business logic to put in Rust.
- `cargo build` is clean, and the binary runs: launched against the built `out/`, it held the window
  open for its whole run and wrote nothing to stderr. What it looks like on screen is the one thing
  this side cannot check.

## Fixed

- **An undone note came back after it had been thrown away.** `⌘Z` returned the text to the composer
  through page state that was never cleared, so the composer — which is re-created whenever the view
  changes or a note closes — applied the same restore again on its next mount. Emptying the box and
  switching views brought the text back. The composer now says `onRestored` the moment the text is
  in it, and the page drops it: handed over exactly once, and a writer who then clears the box has
  decided the note is gone.

- **Opening a note wrote to it.** Switching notes reused one editor instance, so the previous note's
  draft stayed in the pending-write ref while the `note` prop had already changed — and because
  `onSave` was re-created every render, the flush effect re-ran and committed it. The result was one
  note's text saved onto another, plus a reorder on every visit. The editor is now mounted per note
  (`key={note.id}`) and `save` is a stable `useCallback`, so a draft cannot outlive its note.

- **Every MCP tool that answered with a list was unusable.** `structuredContent` may only be a JSON
  object and half the tools return an array — the notes, the folders, the tasks, the week, the
  rules. Clients refuse the whole message rather than the field, so five tools failed identically
  and `list_categories` looked fine only because it happened to return `{ categories, assignments }`.
  `read_note` on an id that does not exist was the same bug wearing a different hat: `null` is not
  an object either. The transport now wraps anything that is not one as `{ "result": … }`, which is
  where the rule belongs — it is a fact about MCP, not about notes, and a tool written next year
  should not have to know it. No `outputSchema` was added: an object schema per tool would say
  nothing the wrap does not already guarantee, and twenty-two hand-written output schemas are
  exactly the drift the generated input schemas exist to avoid.

## Known gaps / debt
- **The manifest is English only.** `app/manifest.ts` is one file in a static export and browsers do
  not negotiate a localised one, so an installed app's name stays English whatever the interface is
  set to. Same for the desktop bundle's `shortDescription` / `longDescription` in `tauri.conf.json`.
- **`components/ui/calendar.tsx` calls `toLocaleString("default", ...)`** for its month names. It is
  registry-owned and must not be hand-edited, so its months follow the machine rather than the
  interface. It is the one string in the app the dictionary does not reach.
- **`indexedDB.databases()` is how "delete everything" finds the stores to drop.** Firefox only grew
  it recently; where it is missing the preferences still go and the notes do not. `shared/lib/erase.ts`
  says so.
- ~~The embedding model has not run end to end.~~ **It has.** Verified in the production build:
  model downloads with visible progress, notes are embedded, and "merchant inventory" finds the
  HEREZE note by meaning alone.
- `public/ort` is ~80MB of runtime variants and ships in the static export. Trimming it to the
  variants a target browser actually loads is a deployment-time optimisation, not a correctness one.
- Model weights come from Hugging Face on first use and are then cached by the browser. Self-hosting
  the weights is the obvious follow-up for a fully offline install.
- CI runs the four commands and the crate's own on every push (`.github/workflows/check.yml`), and a
  tag builds every desktop installer (`.github/workflows/release.yml`). What it still does not do is
  load the built output: the production build was once broken while `typecheck`, `lint`, `test` and
  `build` were all green, because nothing ever opened `out/` in a browser. A step that serves it and
  asserts the database opens is the one that would have caught that.
- `sync`, `config`, `ui` and `test-utils` are still `export {}` stubs.
- **A destination is still a scan of every vector.** The Inbox no longer blocks on it, but nineteen
  hundred unfiled notes against ten thousand filed ones is thirteen seconds of background CPU, spread
  across frames. It is bandwidth-bound rather than badly written — fifteen megabytes read per vote —
  so the fix is an approximate index, not a tighter loop. Nothing under a few hundred unfiled notes
  notices, which is why this is debt rather than a bug.
- **The static export ships its WebAssembly twice.** `out/` is 139MB, and about 38MB of it is
  webpack's own copies under `_next/static/media` of the PGlite and ONNX runtimes already served
  from `/pglite/` and `/ort/`. Nothing fetches them — the app passes the modules it compiled from
  those paths — but they are referenced from the chunks as fallbacks, so deleting them is a
  deployment-time decision rather than a safe one. Worth knowing before choosing a host: the largest
  single file is `ort-wasm-simd-threaded.jsep.wasm` at 26.5MB, over Cloudflare Pages' 25MB per-file
  limit.
- **Windows is built and verified; macOS and Linux are not.** `bun run build:desktop` on Windows
  produces `echo_0.1.9_x64-setup.exe` (31.4MB, NSIS) and `echo_0.1.9_x64_en-US.msi` (34.7MB) from a
  57.2MB binary, and the app runs: the window opens, the Rust side writes its MCP token, and the
  webview leaves 8.1MB of IndexedDB behind — which only exists once PGlite has opened and migrated.
  What no machine here has done is produce a `.dmg` or a `.deb`. The `.icns` has never been read by
  the macOS bundler, and the `glibc floor` step has never run.
- `next-env.d.ts` is committed and rewritten by Next itself — `next dev` points it at `.next/dev/`
  and `next build` at `.next/` — so it flips in `git status` depending on which ran last. Harmless:
  `typecheck` passes either way, with or without `.next` present.
- **PGlite still runs on the main thread.** Moving it to `@electric-sql/pglite/worker` was built and
  reverted: PGlite's bundled data loader reads `window.location` to find its own files, so the worker
  build throws `window is not defined` before `fsBundle` is ever consulted. The `ponytail:` note in
  `packages/db/src/browser.ts` records it. Worth revisiting — it would also make a second tab safe
  through leader election, which today is genuinely unhandled: two tabs open two databases over one
  IndexedDB.
- ~~The note list is capped at 200 rows by the repository.~~ **Fixed.** `list()` defaulted to 200
  and `page.tsx` never passed a limit, so an install past two hundred notes silently held the most
  recent two hundred and nothing on screen said the rest existed — search scanned a truncated
  corpus, the Inbox counted a truncated pile, the stream drew a truncated history. Listing without a
  limit now lists everything, as every other repository here already did, and a caller that wants a
  page says how big. Measured at ten thousand notes: 239ms against 22ms for the two hundred.
- The stream still has no virtualization. `content-visibility` buys the paint cost back — that is
  what makes ten thousand rows scroll — but every note is still a React element and a DOM node, and
  the note list's rows each carry a context menu on top of that.
- The composer's grow-to-fit uses a measure-and-set effect. `field-sizing: content` would delete it,
  but Firefox lacks support — revisit when it lands.
- The composer's metadata row carries three things (word count, `Local · private`, and the undo
  hint) plus the signal chips. Destination suggestions were kept out of it on purpose — they live in
  the Inbox, where a decision is actually being made, rather than in front of someone writing.
- No projects table. See "Projects, deliberately not built" under Phase 5.
- The only way to delete a note is `⌘Z` immediately after writing it. Moving one is now possible from
  everywhere; deleting an older note and archiving are still missing.
- Which folders are open is session state — the tree collapses on reload. `lib/preferences.ts` is
  where it would persist, one line, whenever that starts to annoy.
- The explorer renders every folder and every note of the selected folder. Fine at hundreds; a deep
  tree with thousands of notes wants the same virtualization the stream wants.
- Tasks are created at capture only. A note written before the reader thought of the task cannot be
  turned into one from the editor yet — the note editor has no signal chips.
- The desktop window has never been *looked at* — it builds, launches and stays up, but WebKitGTK is
  a different engine from the one every other check ran against.
- The MCP server has been connected to once, from a real client, and every tool that answers with a
  list was broken until the transport started wrapping them (see Fixed). What has *not* been
  exercised is the writing half — `create_note` through `delete_note`, and the two delete guards —
  against a live database rather than a fake one.
- The MCP server only answers while echo is open; a client started first gets a refused connection.
  Fixing that means a tray icon and autostart, or moving the database to disk — both their own
  piece of work, neither one this needed.
- `bun run build:desktop` on macOS needs `icon.icns`, which `bun run --cwd apps/desktop tauri icon`
  generates. The repo carries the PNGs and the `.ico` because those are what Linux and Windows want.
- No offline indicator, deliberately: there is nothing to say. If the model has not been downloaded
  before the first offline session, search falls back to words and says so already.
- MIT, decided 2026-08-29 and recorded in `LICENSE` and in every `package.json`. Permissive was
  always the intent; the alternative considered and rejected was a source-available licence (FSL,
  PolyForm Shield) that would have forbidden reselling. It was rejected because it costs the words
  "open source", which the hero eyebrow, both meta descriptions, the PWA manifest and the banner all
  claim, and because nobody resells a local-first app that clones in three commands. The site does
  not print the licence anywhere: the footer links the repository, and the README badge is where a
  reader looks for it.
- Scroll-driven animation needs `animation-timeline: view()`. Browsers without it show the finished
  state — nothing is hidden, but the page loses its parallax rather than falling back to a listener.
- Product copy carries no roadmap/phase references any more; empty states describe the product,
  not the build order.
