# S1 — Temporal context

Part of a four-part expansion turning echo from a note app that reads notes into one that holds a
reader's history. The four parts, in dependency order:

| # | Sub-project | Covers |
|---|---|---|
| **S1** | **Temporal context** | temporal expressions → ranges, the personal timeline, "what changed since" |
| S2 | Personal vocabulary | aliases, synonyms, concepts instead of tags, "you may also mean" |
| S3 | Query understanding | decompose a question into filters, contextual reranking, search by memory |
| S4 | Project memory | automatic project brief, soft placement, organize inbox, "because you usually" |

This document is S1 only. Each later part gets its own spec.

## What S1 delivers

1. **Ranges, not just points.** The parser reads `semana passada`, `no fim do mês`, `últimas 3
   semanas`, `recentemente`, `faz uns 3 meses`, `depois que comecei HEREZE` — and returns a span
   with a start and an end, rather than a single instant.
2. **A personal timeline.** Its own destination: one row per day, carrying that day's dominant
   concepts and note count. The compressed spine of everything written.
3. **"What changed."** Returning to a folder says what arrived since the reader last looked at it.
4. **A "Now" band.** Notes whose mentioned dates fall in the current window, at the top of the
   timeline. Not a notification, not an invented task — a view the reader opened.

Out of scope, deliberately: turning `o que aconteceu com auth nas últimas 3 semanas` into a search.
S1 builds `notesInPeriod`; S3 wires natural language to it.

## Boundaries

Nothing here breaks the ten rules in `docs/ARCHITECTURE.md`. In particular:

- The parser stays pure and deterministic: `now` is injected, no model, no network, no API key.
- Detected dates are **derived data** (rule 6). The table can be dropped and rebuilt from the notes.
- Date extraction runs in the analyzer, off the editor's critical path (rule 8).
- A mentioned date never becomes a task. A task exists only where the writer agreed — recorded
  decision, 2026-08-26.

## Architecture

```text
note content ──► @echo/parser  detectPeriods()  ── pure, deterministic
                      │
                      ▼
              @echo/core analyzer  ── writes note_temporal, off the keystroke path
                      │
     ┌────────────────┼─────────────────┐
     ▼                ▼                 ▼
 buildTimeline   notesInPeriod      whatChanged
     │                │                 │
     └────────────────┼─────────────────┘
                      ▼
            apps/web modules/timeline
```

### `@echo/parser` — `src/periods.ts`

```ts
export type PeriodDirection = "past" | "future";
export type PeriodGrain = "day" | "week" | "month" | "year" | "fuzzy";

export type DetectedPeriod = {
  /** The words that produced it, exactly as written. */
  text: string;
  start: Date;
  end: Date;
  direction: PeriodDirection;
  grain: PeriodGrain;
  /**
   * For an event-relative period (`depois que comecei HEREZE`), the name the span is anchored to.
   * The parser cannot resolve it — it has no corpus — so it names it and core resolves it.
   */
  anchor: string | null;
};

export const detectPeriods = (content: string, now: Date): DetectedPeriod[];
```

Four kinds, all deterministic:

1. **Points** — already handled by `detectDates`. A point becomes a period covering its day.
2. **Clock ranges** — `semana passada`, `mês passado`, `ano passado`, `esta semana`, `este mês`,
   `últimas N dias/semanas/meses`, `fim do mês`, `início do mês`, and their English equivalents.
3. **Fuzzy** — `recentemente`/`recently` (last 14 days), `faz uns N meses`/`N months ago` (the month
   that many months back, widened by half a month either side). The constants are named and carry a
   `ponytail:` comment: they are the one place per-writer tuning would land.
4. **Event-relative** — `depois que comecei X`, `desde X`, `antes do projeto X`, `since X`,
   `before X`. Returns `anchor: "X"` with a placeholder span; core resolves it.

`naquela época` is deliberately dropped. It is unanchored: without a second anchor in the same
sentence it names no span, and a parser that guesses one is a parser that cannot be corrected.

### `@echo/core` — `src/temporal.ts`

Pure. `resolvePeriods(periods, anchors)` where `anchors: Map<string, Date>` maps a folder or category
name, folded, to the date of its first note. An anchor the corpus does not know is dropped rather
than guessed at.

### `@echo/core` — `src/timeline.ts`

Pure, no IO.

```ts
export type TimelineDay = {
  /** Midnight local, the key the day is grouped under. */
  date: Date;
  noteIds: string[];
  /** What the day was about: category names where they exist, keywords where they do not. */
  concepts: string[];
};

export const buildTimeline = (notes, labels, options?) => TimelineDay[];
export const notesInPeriod = (notes, period) => Note[];
```

The spine is `note.createdAt` — when a thought was had. Dates *inside* a note are a different
question, answered by the Now band.

### `@echo/core` — `src/changes.ts`

```ts
export type Change = { notes: Note[]; concepts: string[]; since: Date };
export const whatChanged = (notes, labels, since, scope) => Change | null;
```

`null` when nothing arrived, so the interface has one thing to test rather than an empty shape to
render.

### `@echo/core` — `src/observations.ts`

An append-only log of what the reader looked at, separate from `learning_events` so a visit can
never derive a rule. S1 writes one type; S3 extends the same table.

```ts
export type ObservationType = "project_seen";
seen(type, subject): Promise<void>   // deduped: a repeat within 5 minutes is the same visit
lastSeen(type): Promise<Map<string, Date>>
```

### `@echo/db` — migration `0008`

```sql
CREATE TABLE note_temporal (
  note_id   uuid PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE,
  parsed_at timestamptz NOT NULL DEFAULT now(),
  mentions  jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE observations (
  id           uuid PRIMARY KEY,
  workspace_id uuid NOT NULL DEFAULT '…0001',
  type         text NOT NULL,
  subject      text NOT NULL,
  at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX observations_subject_idx ON observations (type, subject, at DESC);
```

One row per note in `note_temporal`, including notes that mention no date at all — that row is what
makes "already parsed, found nothing" different from "not parsed yet", and without it chrono would
re-read every dateless note on every pass.

`mentions` is `jsonb` rather than a second normalized table.

> **ponytail:** the Now band scans `note_temporal` and expands the array in SQL. At ten thousand
> notes that is one pass over a small table, run when the timeline opens rather than per keystroke.
> If it ever needs an index, the upgrade is a normalized `note_dates` table with a btree on `at`.

### `@echo/core` — analyzer

Gains a second pass beside embedding: notes whose `note_temporal.parsed_at` is older than
`updated_at`, or which have no row, get parsed and written. Same shape as the embedding pass —
durable queue derived from the database, so a failure costs a retry.

The two passes are independent: temporal parsing needs no model, so it completes on a fresh install
long before the first vector exists.

### `apps/web` — `modules/timeline/`

- `model.ts` — pure view helpers (grouping into months, formatting a day's label).
- `_components/timeline.tsx` — the view.
- `_components/timeline-day.tsx` — one row: date, concepts, count. Opens the stream at that day.
- `_components/now-band.tsx` — this week's mentioned dates.
- `_components/changes.tsx` — "what changed" for the selected folder or category.

`View` gains `"timeline"`. The rail's `Recent — soon` placeholder becomes the real destination. The
palette gains it. The bottom bar keeps its five items — the sixth would not fit under a thumb, and
the palette is one keystroke away.

## Testing

`bun test`, no runner dependency, matching what is already there.

- `periods.test.ts` — every expression kind in both languages, both directions, the dropped
  `naquela época`, reproducibility (same content + same `now` → same result).
- `temporal.test.ts` — anchor resolution, and an unknown anchor dropped rather than guessed.
- `timeline.test.ts` — grouping across a day boundary, concepts from categories, keyword fallback.
- `changes.test.ts` — nothing new returns `null`; scoped to a folder.
- `observations` — deduped within the window, `lastSeen` takes the newest.
- repository tests against real in-memory PGlite, as the existing ones do.

## Error handling

Every new surface fails the way the existing ones do: a temporal pass that throws reports through
`onProgress` and retries next pass; a timeline with no notes renders an honest empty state, not a
spinner; the Now band with nothing in it is absent rather than empty.
