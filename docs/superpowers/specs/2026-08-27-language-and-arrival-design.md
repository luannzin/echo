# P8 — Language and arrival

Two pieces of `docs/PLAN.md` Phase 8, in the order they have to be built:

| # | Part | Covers | State |
|---|---|---|---|
| **P8a** | Language in the application | dictionaries, runtime locale, sentences out of the domain | ✅ |
| **P8b** | Language on the site | two prerendered documents, the switcher, hreflang | ✅ |
| **P8c** | Settings | the surface every preference lands on, language included | ✅ |
| **P8d** | Arrival | greeting, storage choice, guided tour, checklist | ✅ |
| **P8e** | Identity | the engraved half of the brand, inside the app | ✅ |

Language comes first for one reason: every screen P8d adds is copy, and copy written before the
dictionary exists is copy written twice.

Phase 7 (sync) is still ahead of this. Nothing here waits on it, and nothing here pretends it is
done.

## What this delivers

1. **English and Brazilian Portuguese** across the marketing site, the web app and the desktop
   window, in a shape where a third language is one file plus one line in a map, and a missing key
   is a typecheck failure rather than a blank label.
2. **A settings surface.** Language, storage, appearance, motion, what echo has learned, and the
   data in it. The rail already has the button; today it is disabled.
3. **A first run.** A greeting that asks two questions, then a tour anchored to the real interface
   that advances when the reader actually does the thing, and a checklist that fills from the
   database rather than from a counter the tour keeps.
4. **The engraved identity, inside the application.** The dither, the plates and the choreography
   that carry `apps/www` cross into the app at the one place the app is allowed to be loud.

## Boundaries

Nothing here breaks the ten rules in `docs/ARCHITECTURE.md`, and nothing weakens a contract in an
`AGENTS.md`. In particular:

- **No translation dependency.** The dictionaries are typed TypeScript, checked by the compiler.
  `next-intl`, `lingui` and `i18next` all solve routing, extraction and ICU plural syntax; a static
  export has no routing to solve, two languages need no extraction pipeline, and English and
  Portuguese share the same two plural forms. See "Decisions taken" for the ceiling.
- **A domain package never holds a sentence.** `@echo/search` and `@echo/core` return reason codes;
  the interface turns a code into words. This is rule 2 (no React in the domain) applied to prose.
- **Nothing about language reaches the database in this phase.** `localStorage`, shaped so Phase 7
  can lift it into `user_preferences` without renaming a key.
- **The site and the app share the pattern, not the code.** `apps/www/AGENTS.md` forbids workspace
  dependencies, and that rule stands. The two surfaces already share a palette and not a stylesheet;
  they now share a dictionary shape and not a dictionary.
- **The arrival never fabricates.** Sync storage appears as a real choice that is not available yet,
  named as such, with no phase number in the copy (root `AGENTS.md`).
- **Every motion added here sits inside `prefers-reduced-motion: no-preference`**, and the tour is
  fully operable from the keyboard, because a pointer-only tour is a tour that teaches nobody (root
  `AGENTS.md`, keyboard twin rule).

## What is already true

Read this before estimating. Half of the hard part of this phase is already done, and the traps are
not where they usually are.

**Already in place:**

- **The parser is bilingual.** `packages/parser/src/dates.ts` runs `chrono.pt` first (so `03/12` is
  3 December, day-first) and `chrono.en.casual` after it, `relative-pt.ts` adds the offsets chrono's
  Portuguese locale misses (`em 3 dias`, `daqui a duas semanas`), `DEADLINE_MARKERS` covers `before`
  and `até` and `prazo` together, and `stopwords.ts` holds both word lists. A note written in
  Portuguese already parses its dates and its keywords today. **P8 adds nothing to the parser.**
- **The embedding model is already multilingual**, on both hosts: `Xenova/multilingual-e5-small` in
  `packages/embeddings/src/local.ts` and the same repo in `apps/desktop/src-tauri/src/lib.rs`. Open
  decision 2 in `docs/PLAN.md` is closed in favour of multilingual and should be marked so.
  **Semantic search in pt-BR needs nothing.**
- **Lexical search does not stem.** The generated column uses `to_tsvector('simple', ...)`, which
  has no dictionary for any language, so Portuguese and English are already treated identically. No
  work, and no regression to guard against.
- **Time is formatted in one file.** `apps/web/shared/lib/time.ts`, on `date-fns`, whose locale is
  an argument rather than a rewrite. Its own header already says so.
- **Slash commands already carry both languages** in their match keywords (`shared/lib/slash.ts`:
  `"heading title h1 big titulo cabecalho"`).
- **The pre-paint bootstrap pattern exists.** `MODE_ON_OPEN` in `apps/web/app/layout.tsx` is a
  blocking head script that reads `localStorage` and sets a `documentElement` attribute before
  anything paints, precisely because this is a static export. Locale reuses it verbatim.
- **The type covers the accents.** Geist and Geist Mono are loaded with `subsets: ["latin"]`, which
  carries every character pt-BR needs.
- **The rail already has the Settings button**, rendered disabled with a `Settings` icon.

**Traps:**

- **Both apps are `output: "export"`.** No middleware, no server redirect, no Next i18n routing.
  Locale in the app is a runtime value; on the site it is two prerendered documents.
- **Three places assemble a sentence from fragments,** and Portuguese cannot reorder a fragment
  after the fact:
  - `packages/search/src/context.ts` `explainContext` returns English clauses.
  - `apps/web/modules/inbox/plan.ts` `reasonsFor` builds `you usually put X and Y notes there` and
    joins the list with `" and "`.
  - `apps/web/modules/intelligence/_components/learned.tsx` `subjectOf` and `phrasing` are two
    halves of one sentence, glued at the render site.

  These are the structural change in P8a. Everything else is substitution.
- **Six components are `memo()`d** (`note-row`, `stream-row`, `stream`, `task-row`, `timeline-day`,
  the tab in `tab-strip`). A locale change that does not remount leaves stale English on screen in
  exactly the rows a reader is looking at.
- **`localeCompare()` is called with no locale** in the sort paths, and `" and "` is hard-coded as a
  list conjunction.
- **`apps/www` may not import from `@echo/*`.** Its dictionary is its own.
- **There is no preference store.** `shared/lib/preferences.ts` is two functions over
  `localStorage`, boolean only, and there is no `user_preferences` table in `packages/db/schema.ts`
  despite `docs/PLAN.md` Phase 1 listing one.
- **Portuguese runs roughly 20 to 30 percent longer than English,** and `.label` (mono, uppercase,
  tracked at `0.18em`) is the least forgiving specification on either surface. The rail tooltips,
  the palette rows and the site's section labels are where this shows first.

---

## P8a — Language in the application

### The dictionary

```text
apps/web/shared/lib/i18n/
  en.ts        the source of truth; every key, every sentence
  pt.ts        typed against en, so a missing key does not compile
  index.ts     the active locale, the getter, the bootstrap
  locales.ts   the list, the labels, the date-fns locale, the Intl tag
```

`en.ts` exports a nested object. A value is a string when it never varies and a function when it
does:

```ts
export const en = {
  rail: {
    write: "Write",
    search: "Search",
    inbox: "Inbox",
    inboxWaiting: (count: number) =>
      count === 1 ? "Inbox, 1 note to place" : `Inbox, ${count} notes to place`,
  },
  learned: {
    destinationAccept: (place: string) => `${place} is where notes like that go`,
    destinationReject: (place: string) => `${place} is not where notes like that go`,
    aliasAccept: (a: string, b: string) => `“${a}” and “${b}” mean the same thing`,
  },
} as const;

export type Dictionary = typeof en;
```

```ts
// pt.ts
import type { Dictionary } from "./en";

export const pt: Dictionary = {
  rail: {
    write: "Escrever",
    search: "Buscar",
    inbox: "Entrada",
    inboxWaiting: (count) =>
      count === 1 ? "Entrada, 1 nota para arquivar" : `Entrada, ${count} notas para arquivar`,
  },
  learned: {
    destinationAccept: (place) => `notas assim vão para ${place}`,
    // ...
  },
};
```

Three properties fall out of this, and they are the whole reason it is not JSON:

- **A missing key is a compile error.** `type Dictionary = typeof en` with `pt` annotated against it
  is exact structural checking, including the arity of every function. `bun run typecheck` is the
  translation completeness check, and there is no second tool to run.
- **A sentence is never concatenated.** The unit is the finished sentence, so `notas assim vão para
  Trabalho/Auth` can put the place last where English puts it first. This is the property that makes
  the whole thing work, and it is the one a `t("learned.destination") + place` design throws away.
- **Plurals and interpolation cost nothing.** English and Portuguese both have one form and an other
  form, and a ternary reads better than an ICU string. A language with more forms (Russian, Polish,
  Arabic) swaps the ternary for `Intl.PluralRules` in that one key, with no change to the shape.

Keys are grouped by where they are read: one group per module (`rail`, `composer`, `inbox`, `tasks`,
`timeline`, `search`, `editor`, `explorer`, `intelligence`, `settings`, `arrival`) plus `common` for
the words two modules share. Whether copy belongs in `common` is decided the way `shared/` already
decides it: two consumers, not one and a guess.

Estimated size, to be replaced by a real number by the inventory task that opens this part: 250 to
350 keys for the application. `apps/web` carries roughly 8,200 lines of TSX, and copy also lives in
`app/commands.ts`, `shared/lib/slash.ts` and the empty states.

### Access

```ts
// shared/lib/i18n/index.ts
let active: Dictionary = en;

/** The words, now. Read at render time, never destructured into a module constant. */
export const copy = (): Dictionary => active;
```

A component reads `copy().rail.write`. No provider, no hook, no prop threaded through forty
components, which keeps root `AGENTS.md`'s "no React context, one owner, props downward" intact:
locale is not application state being passed around, it is a module the components import, the same
way they import `lucide-react`.

The one rule that comes with it: **never lift `copy()` into a module-level constant.** A `const
words = copy().rail` at the top of a file captures the dictionary that was active when the module
was first evaluated. This goes into `apps/web/AGENTS.md` when the module lands.

### Bootstrap

`app/layout.tsx` gains a second blocking script beside `MODE_ON_OPEN`, for the same reason: this is
a static export, and the prerendered markup is on screen before React exists.

```js
try{
  var stored = localStorage.getItem('echo:locale');
  document.documentElement.lang =
    stored || (navigator.language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en');
}catch(e){}
```

`<html lang>` stops being hard-coded `"en"` and becomes the single source of truth. React reads
`document.documentElement.lang` on mount to seed its state, so there is one answer and no flash, in
the browser and in the Tauri window alike. It fails to English, which is the same failure mode
`MODE_ON_OPEN` already accepts.

`app/postit/page.tsx` is a second document in the same export and needs the same two lines. It has
no database, so it reads the dictionary and nothing else.

### Changing the language

`app/page.tsx` owns a `locale` state. Setting it does three things: writes
`localStorage["echo:locale"]`, sets `document.documentElement.lang`, and points `active` at the new
dictionary. The state update then re-renders the tree.

Six components are `memo()`d and their props do not change when the dictionary does, so the shell
subtree carries `key={locale}`. That remount is the guarantee: no component in the app can hold a
stale string past a language change, and it costs one remount on an action taken about once in a
product's life.

**The key goes below the state that holds the composer draft**, so switching language does not throw
away what the reader was writing. That is a hard requirement on where it is placed, not a preference.

### Sentences out of the domain

`packages/search/src/context.ts`:

```ts
export type ContextReason = "same-project" | "co-opened" | "shared-concepts" | "same-period";

export const explainContext = (signals: ContextSignals): ContextReason[] => { /* ... */ };
```

The interface owns the words. Same treatment for the two app-side sentence builders:

- `modules/inbox/plan.ts` `reasonsFor` returns a discriminated union instead of `string[]`:
  `{ kind: "habit"; concepts: string[] } | { kind: "neighbour"; title: string }`. The component
  renders `copy().inbox.habit(concepts)`, and the Portuguese version joins the list with
  `Intl.ListFormat` rather than `" and "`.
- `modules/intelligence/_components/learned.tsx`: `subjectOf` and `phrasing` collapse into one
  lookup keyed by `rule.kind` and `rule.outcome`, returning the finished sentence with the subject
  already inside it. The current split is an English grammar rule wearing a function.

This is the only refactor in P8a, and it is worth doing on its own merits: a reason code is testable
and a reason sentence is not.

### Dates, numbers, lists, sorting

- `shared/lib/time.ts` takes a locale. `date-fns/locale/pt-BR` for `formatDistanceStrict`, and the
  format tokens change with it (`d MMMM` becomes `d 'de' MMMM`), so the format strings move into the
  locale table in `locales.ts` rather than staying inline. `formatStamp`, `formatDay`, `formatExact`
  and `formatDue` are the four call sites and all four are in that one file.
- `Intl.ListFormat(locale)` replaces every hard-coded conjunction.
- Every `localeCompare` gets the active locale, so `ação` sorts where a Portuguese reader expects it.
- `components/ui/calendar.tsx` calls `toLocaleString("default", ...)`. That file is registry-owned
  and must not be hand-edited (root `AGENTS.md`); pass the locale through the component's props if
  the primitive accepts one, and otherwise leave it and record the ceiling.
- `app/commands.ts` and `shared/lib/slash.ts`: labels become dictionary lookups, and the `keywords`
  fields stay exactly as they are. They are already bilingual on purpose, because a reader who set
  the interface to Portuguese may still reach for `search`.

### Verification

```bash
bun run --cwd apps/web typecheck   # this is the translation completeness check
bun run lint
bun run test
bun run --cwd apps/web build
```

Then read the app in Portuguese at 1440px and at 390px, with the rail tooltips open. A label that
wraps is the bug this pass exists to find.

---

## P8b — Language on the site

### Routing

`apps/www` is a static export, so there is no middleware and no redirect. Two prerendered documents,
English at the root:

```text
app/
  (en)/layout.tsx      <html lang="en">      → /
  (en)/page.tsx
  (pt)/layout.tsx      <html lang="pt-BR">   → /pt-br
  (pt)/pt-br/page.tsx
components/page.tsx    the page itself, taking a locale
content/en.ts          the site's own dictionary
content/pt.ts
```

No `app/layout.tsx`. Two route groups with no root layout above them is Next's documented
multiple-root-layouts arrangement, and it is what lets each document declare its own `<html lang>`
without a dynamic segment, which a static export cannot pair with a root redirect anyway.

English keeps `/`. Existing links, the README, the OG card and anything already indexed continue to
resolve, and no visitor pays a redirect to read the default language.

Every section component takes the locale's content object as a prop. `install-box.tsx` and
`composer-demo.tsx` stay the only two client components; copy reaches them as props like everything
else.

**The demo corpus is not translated.** `apps/www/AGENTS.md` is explicit that the demo mechanics are
the running app's and the corpus is illustration. Chips, counts and reason sentences are mechanics
and get translated. Note titles are corpus, and a working programmer's notebook in Brazil has the
same English library names in it. Translating them would make the demo read as staged.

### Detection

No automatic redirect. A visitor arriving at `/` whose `navigator.language` starts with `pt` gets a
dismissible line at the top of the page offering `Ler em português`, and the dismissal is stored.
Auto-redirecting a static host breaks the back button, splits the crawl, and takes the choice away
from the many Brazilians who read documentation in English on purpose.

A switcher sits in `site-nav.tsx` and again in `site-footer.tsx`, so the choice is reachable at both
ends of a long page.

### Metadata

Both layouts emit `alternates.languages` with `en` and `pt-BR` plus `x-default` pointing at the
root, `openGraph.locale`, and a matching `title` and `description` per language.

### Typography

The pass that actually needs eyes. `.label` is mono, uppercase and tracked at `0.18em`, and the
hero's eyebrow (`No AI · Open source · Runs on your machine · No account`) is already at the edge of
one line at 390px. Its Portuguese is longer.

Rules for this pass:

- Portuguese copy is written to fit, not translated and then patched. A shorter true sentence beats
  a faithful one that wraps into three lines of tracked capitals.
- The contrast floor in `apps/www/AGENTS.md` (4.69:1 at 11px) is measured again on the Portuguese
  page, because the accents change where the ink sits over a bright plate.
- No section may scroll sideways at 390px in either language.

### Verification

```bash
bun run --cwd apps/www typecheck
bun run --cwd apps/www build
```

Then read both documents at 1440px and 390px, and confirm the export wrote `out/index.html` and
`out/pt-br/index.html`.

---

## P8c — Settings

A new module, `modules/settings/`, and a sixth `View`. The rail's disabled button becomes real.

### The preference store

`shared/lib/preferences.ts` grows from two boolean functions into a typed store over the same
synchronous `localStorage`, keeping the `echo:` prefix and the existing key names so nothing already
written is orphaned. A `PREFERENCES` table declares each key, its type and its default; reads stay
synchronous, because a settings panel that flashes its defaults before showing the reader's answer
is exactly what the current file's header refuses to do.

Keys are named as they will be named in Phase 7's `user_preferences` table, so sync lifts them
rather than migrating them.

### Sections

| Section | Contents |
|---|---|
| Language | English, Português (Brasil). Applies immediately, no reload. |
| Storage | On this machine, chosen. Synced, shown and disabled. |
| Appearance | Theme. `docs/DESIGN.md` says light mode is a token swap and that no component hard-codes a colour, so this is real work and it is small. |
| Motion | Follow the system, or always reduce. Sets an attribute the stylesheet already keys off. |
| What echo has learned | The existing `Learned` component, moved here or linked from the intelligence panel. Every rule undoable, as it already is. |
| Your notes | Save a copy (exists), export everything, and a destructive reset behind a typed confirmation. |
| Getting started | Replay the tour. Reset the checklist. |
| Keyboard | The shortcut map, read from `shared/lib/shortcuts.ts` rather than retyped. |
| About | Version, the model in use, a link to the source. |

Settings is built before the arrival for two reasons: the arrival writes into the same store, and
"Replay the tour" has to have somewhere to live before there is a tour to replay.

---

## P8d — Arrival

A new module, `modules/onboarding/`. Three surfaces and one rule underneath all of them.

**The rule: nothing here keeps its own idea of what the reader has done.** Completion is read from
the database and from the domain event bus. A reader who wrote four notes before this ships opens
the app to a checklist that is already finished, and a reader who ignores the tour and files a note
by hand still gets the tick. The only thing stored is what was dismissed.

### First run

Shown when there are zero notes **and** `echo:arrival` has not been dismissed. Both conditions, so a
cleared `localStorage` on a full notebook does not greet a long-standing reader.

Full surface, and the one place the loud half of the brand is allowed inside the application: the
`burst` plate behind the type, dithered, and the hero's `.beat` choreography.

**Two questions, then it stops.**

1. **Language.** Preselected from `navigator.language`, two large targets, applied live so the rest
   of the screen changes under the pointer. It is the cheapest possible demonstration that the
   setting works.
2. **Where the notes live.** Two cards. `On this machine` is selected and real: the database is in
   the browser, nothing leaves, no account. `Synced across your devices` is rendered and disabled,
   and says it is not available yet, with no phase number and no date. The choice is recorded either
   way, so when sync lands the reader is not asked twice.

No account, no name, no email, no third question. Anything else asked here is a question echo does
not need the answer to.

### The tour

Coach marks over the real interface. Not a modal carousel, and not a picture of the app.

**Anchoring.** Existing components gain a `data-tour="composer"` attribute and nothing else. No
wrapper, no ref threaded upward, no new prop. One `<Tour />` owner reads the attribute, measures with
`getBoundingClientRect`, and re-measures on a `ResizeObserver` over the body and on scroll.

**The spotlight.** A fixed, `pointer-events: none` element positioned over the target, carrying
`box-shadow: 0 0 0 100vmax` in the scrim colour plus the app's own radius token. Moving between
steps transitions `top`, `left`, `width`, `height` and `border-radius`, so the light travels rather
than cutting, and the target underneath stays clickable throughout. One element, no SVG mask, no
layout thrash.

**Advancing.** Every step is completed by the reader doing the thing, observed on the domain event
bus, never by a Next button:

| Step | Anchor | Completed by |
|---|---|---|
| Write a line | the composer | first keystroke |
| Press Enter | the composer | `NoteCreated` |
| See what echo found | the chips it produced | the analysis landing, skipped silently if it found nothing |
| Ask for it back | the palette | a search that returns the note |
| Give it a place | the Inbox row | `NoteMoved`, or a category applied |

Step three is skipped when the analyzer found nothing in what the reader wrote, because a tour that
points at an empty panel and says "look what it found" is a tour that lies in its third step.

**Leaving.** Escape, a visible Skip on every step, and the step counter as a claim about length. It
never comes back on its own, and Settings is where it comes back from.

**Keyboard and screen readers.** Focus moves into the coach mark on each step and returns to the
anchored control when it advances. The mark is a labelled dialog, the step change is announced on a
polite live region, and Escape ends the tour from anywhere. Root `AGENTS.md` requires a keyboard
twin for every pointer affordance, and the tour is not exempt from the rule it is teaching.

### The checklist

Five items, the same five as the tour, derived the same way.

**Where it lives:** at the foot of the navigation panel on desktop, and in the navigation sheet on a
phone. Collapsed to one line showing the count once anything is done.

**And once, loudly:** as a card above the composer on the home screen while zero of the five are
done. That is the only moment the checklist earns the writing surface, and it removes itself the
moment the reader writes anything. A permanent card over the text area is a permanent tax on the one
thing the product is for.

Dismissible forever, restorable from Settings. On the fifth tick it retires itself with the app's
existing `--animate-arrive-glow` rather than announcing anything.

---

## P8e — Identity

`docs/DESIGN.md` divides the brand into a loud marketing half and a quiet application half, and says
motion in the app is 150 to 260ms, opacity and small translation, nothing bounces. **That stays true
for every working surface.** The proposal is one bounded exception, written into `DESIGN.md` rather
than smuggled past it:

> The arrival surfaces (first run, tour, checklist completion) are the one place inside the
> application where the marketing half of the brand is used. They are seen once. Everything a reader
> sees on the second day stays quiet.

What crosses over:

- **The dither and one or two plates.** Copied into `apps/web/shared/_components/engraving.tsx` with
  a filter definition beside it, deliberately duplicated from `apps/www` and documented as a second
  copy, exactly as the two `globals.css` files re-declare the brand values. `apps/www/AGENTS.md`
  forbids workspace dependencies in the site, so a shared package cannot be the answer without
  changing that contract.
- **The `.beat` choreography.** Transitions out of `@starting-style`, never keyframes with a
  backwards fill, for the reason `apps/www/AGENTS.md` already gives: the declared state has to be
  the finished one, or the screen is blank wherever timelines do not advance.
- **The mono micro-label**, which both surfaces already share.

New motion, all of it inside `prefers-reduced-motion: no-preference`, all of it on existing tokens:

- The spotlight travels between steps on `--ease-out-quart`.
- A checklist tick draws itself on `stroke-dashoffset`.
- The plate on the first-run screen drifts with pointer position, capped small, and does not move at
  all under reduced motion.

Nothing bounces. The instruction is that this should feel alive, and on this brand alive is a 1980s
printer, not a spring.

---

## Order

```text
P8a  language in the app     the dictionary, the bootstrap, reason codes, dates      ← largest
P8b  language on the site    two documents, detection, the Portuguese type pass
P8c  settings                the preference store, then the surface
P8d  arrival                 first run, tour, checklist
P8e  identity                the engraving crossing over, the motion
```

P8a first because it is the constraint: every string P8c and P8d write lands in the dictionary, and
writing them before it exists means writing them twice. P8b can run beside P8a; it shares no code.
P8c before P8d because the arrival writes into the store P8c defines and needs somewhere to be
replayed from.

Each part ends the way every phase in this repo ends: `bun run typecheck && bun run lint && bun run
test` green, then `docs/STATE.md` updated.

**Checkpoint before P8d.** The tour is the part where taste decides the outcome, and it should be
looked at running rather than read in a plan.

## What changed while building it

Four things the plan got wrong, and what they became.

1. **The tour needed a Next after all.** The plan said no Next button on a step, because the step is
   a thing to do rather than a sentence to read. That holds for four of the five: `read` is not the
   reader's to force — whether echo *found* anything depends on what they happened to write, and a
   first note with no date and no task in it left the tour pointing at an empty row indefinitely.
   Doing the thing is still how a step is meant to end; Next is how a reader is never stuck.
2. **The site's content cannot hold functions.** The application's dictionary is full of them, and
   `content/` cannot be: it is handed to `install-box.tsx`, a client component, and the build refuses
   to serialise a function across that boundary. `copyLabel(target)` became two finished strings.
3. **The detection banner became a link in the nav.** The plan wanted a dismissible line offering
   Portuguese. A dismissal needs state and storage, which needs a third client component on a page
   whose contract allows two — and the switcher in the nav and the footer is visible at every
   viewport and costs neither.
4. **The negotiated language is not a choice.** `setLocale` wrote it down on mount, which pinned a
   guess forever, made the app stop following a browser whose language changed, and lit the
   "make it yours" milestone on a notebook where nobody had chosen anything. Split into
   `adoptLocale` (points the dictionary, writes nothing) and `setLocale` (also records the answer).

## Decisions taken

1. **No i18n library.** Typed TypeScript dictionaries, checked by `tsc`. The ceiling: this makes a
   translator open a code editor, and it does not produce extractable JSON. If translation is ever
   handed to someone outside the repo, generate JSON from `en.ts` and swap what `copy()` reads. That
   is a loader change and not a rewrite, which is why the ceiling is acceptable now.
2. **English stays at `/` on the site.** Portuguese at `/pt-br`. No redirect, because a static export
   cannot serve one, and no detection redirect, because it would be wrong for a large part of the
   audience.
3. **Runtime locale in the app, not routed.** The app is a single static document that becomes an
   SPA. A locale in its URL would buy nothing and cost a routing layer.
4. **The site keeps its own dictionary.** `apps/www/AGENTS.md`'s no-workspace-dependencies rule is
   left intact. The alternative, a zero-dependency `@echo/i18n` package holding only strings, does
   not violate the reason the rule gives, but it does violate the rule, and that is a contract the
   author changes rather than an implementer.
5. **Both dictionaries ship in the bundle.** Two languages of interface copy is tens of kilobytes,
   and a dynamic import would put an async boundary and a flash in front of a language switch. At
   four or more locales this becomes an `import()` per locale behind the same getter.
6. **Completion is derived, not counted.** The checklist reads the database and the event bus, so it
   is true for a reader who arrived before it existed.

## Open questions

1. **Does the sync question belong in the first run at all?** It is `docs/PLAN.md` §49 and it is what
   was asked for, and it is also a disabled card in a two-question greeting. The alternative is one
   question now (language), with the storage choice appearing in the first run only once sync exists.
   Recorded here because it is a product call; the plan above assumes the storage card stays.
2. **Light mode.** `docs/DESIGN.md` calls it a token swap, which makes it cheap, but nobody has
   looked at this app in light. It is listed in P8c and it is the one item there that could grow.
3. **How much Portuguese is written and how much is translated?** The plan assumes written, which is
   slower and produces the only version of this that does not read as a translation.

## DOX pass

When these land:

- Root `AGENTS.md`: add `onboarding` and `settings` to the module list; add the rule against lifting
  `copy()` into a module constant; note the preference store.
- `apps/www/AGENTS.md`: the two-document routing contract, which sections take content as props, and
  the standing rule that demo mechanics are translated and the corpus is not.
- `docs/DESIGN.md`: the bounded exception in P8e, and light mode if it ships.
- `docs/PLAN.md`: expand Phase 8 into P8a to P8e; close open decision 2, since the multilingual model
  is already in use on both hosts.
- `docs/STATE.md`: at the end of every part.
