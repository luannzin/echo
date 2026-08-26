import { AMOUNT_PATTERN, fold, parseAmount } from "./numbers";

/**
 * Spans of time people name in their own notes. `detectDates` reads the instants — "amanhã",
 * "before Friday" — and this reads the stretches: "semana passada", "nas últimas 3 semanas", "no
 * fim do mês", "recentemente", "depois que comecei HEREZE".
 *
 * Pure and deterministic like everything else here: `now` is injected, no model, no network.
 */

export type PeriodDirection = "past" | "future";
export type PeriodGrain = "day" | "week" | "month" | "year" | "fuzzy";

export type DetectedPeriod = {
  /** The words that produced it, exactly as the writer typed them. */
  text: string;
  /** Where in the content it was found, so two readings of one phrase never both survive. */
  index: number;
  /** `null` is an open edge: unbounded, or waiting on an anchor this parser cannot resolve. */
  start: Date | null;
  end: Date | null;
  direction: PeriodDirection;
  grain: PeriodGrain;
  /**
   * For a span named against something that happened rather than against the clock — "depois que
   * comecei HEREZE" — the name it hangs off. The parser has no corpus, so it reports the name and
   * `@echo/core` resolves it against the reader's own folders and categories.
   */
  anchor: string | null;
  /** Which edge the anchor supplies. Null when there is no anchor. */
  anchoredEdge: "start" | "end" | null;
};

type Unit = "day" | "week" | "month" | "year";

const MS = 1;

const startOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const endOfDay = (date: Date): Date => {
  const end = startOfDay(date);
  end.setDate(end.getDate() + 1);
  return new Date(end.getTime() - MS);
};

/**
 * Monday. ISO rather than the Sunday a Brazilian calendar prints, because a working week is what
 * someone means by "semana passada" when they are looking for what they wrote.
 *
 * ponytail: fixed. If this ever reads wrong for a reader, it becomes a preference.
 */
const startOfWeek = (date: Date): Date => {
  const start = startOfDay(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

const startOfMonth = (date: Date): Date => {
  const start = startOfDay(date);
  start.setDate(1);
  return start;
};

const startOfYear = (date: Date): Date => {
  const start = startOfMonth(date);
  start.setMonth(0);
  return start;
};

const shift = (from: Date, amount: number, unit: Unit): Date => {
  const moved = new Date(from);
  if (unit === "day") moved.setDate(moved.getDate() + amount);
  else if (unit === "week") moved.setDate(moved.getDate() + amount * 7);
  else if (unit === "month") moved.setMonth(moved.getMonth() + amount);
  else moved.setFullYear(moved.getFullYear() + amount);
  return moved;
};

const startOf = (date: Date, unit: Unit): Date =>
  unit === "day"
    ? startOfDay(date)
    : unit === "week"
      ? startOfWeek(date)
      : unit === "month"
        ? startOfMonth(date)
        : startOfYear(date);

/** The whole of the unit `date` falls in — the week it belongs to, the month it belongs to. */
const spanOf = (date: Date, unit: Unit): { start: Date; end: Date } => {
  const start = startOf(date, unit);
  return { start, end: new Date(shift(start, 1, unit).getTime() - MS) };
};

const UNITS: Record<string, Unit> = {
  dia: "day",
  dias: "day",
  day: "day",
  days: "day",
  semana: "week",
  semanas: "week",
  week: "week",
  weeks: "week",
  mes: "month",
  meses: "month",
  month: "month",
  months: "month",
  ano: "year",
  anos: "year",
  year: "year",
  years: "year",
};

/**
 * How wide a remembered span is. "Faz uns três meses" is not a date; it is a neighbourhood, and one
 * that is wrong more often than it is right if it is read as a single month.
 *
 * ponytail: fixed windows. These are the one place per-writer tuning would land, if a reader's
 * "recentemente" turns out to be a fortnight rather than a month.
 */
const FUZZ_MS: Record<Unit, number> = {
  day: 1.5 * 24 * 60 * 60 * 1000,
  week: 4 * 24 * 60 * 60 * 1000,
  month: 15 * 24 * 60 * 60 * 1000,
  year: 60 * 24 * 60 * 60 * 1000,
};

/** How far back "recentemente" reaches. Long enough to hold a working fortnight. */
const RECENTLY_DAYS = 14;

/** The last stretch of a month, and the first. A month has no exact fifth of it. */
const MONTH_EDGE_DAY = 21;
const MONTH_OPENING_DAY = 10;

/** A name is what the span hangs off; these words are the clock, and never a name. */
const NOT_A_NAME = new Set([
  "semana",
  "mes",
  "ano",
  "dia",
  "dias",
  "semanas",
  "meses",
  "anos",
  "ontem",
  "hoje",
  "amanha",
  "agora",
  "entao",
  "isso",
  "week",
  "month",
  "year",
  "day",
  "days",
  "weeks",
  "months",
  "years",
  "yesterday",
  "today",
  "tomorrow",
  "now",
  "then",
  "that",
  "the",
]);

const NAME = "[\\p{L}\\p{N}][\\p{L}\\p{N}'’_-]*(?:\\s+[\\p{L}\\p{N}][\\p{L}\\p{N}'’_-]*){0,2}";

type Built = Omit<DetectedPeriod, "text" | "index"> | null;
type Matcher = { source: string; build: (match: RegExpExecArray, now: Date) => Built };

const clock = (
  start: Date | null,
  end: Date | null,
  direction: PeriodDirection,
  grain: PeriodGrain,
): Built => ({ start, end, direction, grain, anchor: null, anchoredEdge: null });

/** A span reaching back `amount` units from now — "nas últimas 3 semanas". */
const trailing = (now: Date, match: RegExpExecArray, at: number, unitAt: number): Built => {
  const amount = parseAmount(match[at] ?? "");
  const unit = UNITS[fold(match[unitAt] ?? "")];
  if (amount === null || !unit) return null;
  return clock(startOfDay(shift(now, -amount, unit)), now, "past", unit);
};

/** A neighbourhood around a point that far back — "faz uns 3 meses", "three months ago". */
const around = (now: Date, match: RegExpExecArray, at: number, unitAt: number): Built => {
  const amount = parseAmount(match[at] ?? "");
  const unit = UNITS[fold(match[unitAt] ?? "")];
  if (amount === null || !unit) return null;
  const centre = shift(now, -amount, unit).getTime();
  return clock(new Date(centre - FUZZ_MS[unit]), new Date(centre + FUZZ_MS[unit]), "past", "fuzzy");
};

/** A whole unit, `offset` of them away from the one now falls in. */
const whole = (now: Date, raw: string, offset: number, direction: PeriodDirection): Built => {
  const unit = UNITS[fold(raw)];
  if (!unit) return null;
  const { start, end } = spanOf(shift(now, offset, unit), unit);
  return clock(start, end, direction, unit);
};

/** A name the reader gave something, with the clock's own words refused. */
const named = (raw: string | undefined, edge: "start" | "end", now: Date): Built => {
  const anchor = (raw ?? "").trim().replace(/\s+/g, " ");
  const [first = ""] = fold(anchor).split(" ");
  if (anchor.length === 0 || NOT_A_NAME.has(first)) return null;
  return {
    start: edge === "start" ? null : null,
    // "Since X" runs up to now; "before X" runs from whenever the notes begin.
    end: edge === "start" ? now : null,
    direction: "past",
    grain: "fuzzy",
    anchor,
    anchoredEdge: edge,
  };
};

/**
 * Clock spans are read before named ones, so "desde a semana passada" is last week rather than a
 * project nobody has called "semana passada".
 */
const MATCHERS: Matcher[] = [
  // ── Trailing windows ────────────────────────────────────────────────────────────────────────
  {
    source: `\\b(?:n?[oa]s\\s+)?[úu]ltim[oa]s?\\s+(${AMOUNT_PATTERN})\\s+(dias?|semanas?|m[êe]s|meses|anos?)\\b`,
    build: (match, now) => trailing(now, match, 1, 2),
  },
  {
    source: `\\b(?:the\\s+)?(?:last|past)\\s+(${AMOUNT_PATTERN})\\s+(days?|weeks?|months?|years?)\\b`,
    build: (match, now) => trailing(now, match, 1, 2),
  },
  // ── Remembered neighbourhoods ───────────────────────────────────────────────────────────────
  {
    source: `\\b(?:faz|h[áa])\\s+(?:uns?\\s+|umas?\\s+|alguns\\s+|algumas\\s+)?(${AMOUNT_PATTERN})\\s+(dias?|semanas?|m[êe]s|meses|anos?)\\b`,
    build: (match, now) => around(now, match, 1, 2),
  },
  {
    source: `\\b(${AMOUNT_PATTERN})\\s+(days?|weeks?|months?|years?)\\s+ago\\b`,
    build: (match, now) => around(now, match, 1, 2),
  },
  // ── Whole units ─────────────────────────────────────────────────────────────────────────────
  {
    source: "\\b(?:n?[oa]\\s+)?(semana|m[êe]s|ano)\\s+retrasad[oa]\\b",
    build: (match, now) => whole(now, match[1] ?? "", -2, "past"),
  },
  {
    source: "\\b(?:n?[oa]\\s+)?(semana|m[êe]s|ano)\\s+passad[oa]\\b",
    build: (match, now) => whole(now, match[1] ?? "", -1, "past"),
  },
  {
    source: "\\blast\\s+(week|month|year)\\b",
    build: (match, now) => whole(now, match[1] ?? "", -1, "past"),
  },
  {
    source: "\\b(?:n?est[ae]|n?ess[ae])\\s+(semana|m[êe]s|ano)\\b",
    // "This week" is nearly always asked about what has already happened in it.
    build: (match, now) => whole(now, match[1] ?? "", 0, "past"),
  },
  {
    source: "\\bthis\\s+(week|month|year)\\b",
    build: (match, now) => whole(now, match[1] ?? "", 0, "past"),
  },
  {
    source:
      "\\b(?:n?[oa]\\s+)?(?:pr[óo]xim[ao]\\s+(semana|m[êe]s|ano)|(semana|m[êe]s|ano)\\s+que\\s+vem)\\b",
    build: (match, now) => whole(now, match[1] ?? match[2] ?? "", 1, "future"),
  },
  {
    source: "\\bnext\\s+(week|month|year)\\b",
    build: (match, now) => whole(now, match[1] ?? "", 1, "future"),
  },
  // ── Edges of a month ────────────────────────────────────────────────────────────────────────
  {
    source:
      "\\b(?:n?o\\s+)?(?:fim|final)\\s+d[oe]\\s+m[êe]s\\b|\\b(?:at\\s+the\\s+)?end\\s+of\\s+(?:the\\s+)?month\\b",
    build: (_match, now) => {
      const { end } = spanOf(now, "month");
      const start = startOfMonth(now);
      start.setDate(MONTH_EDGE_DAY);
      return clock(start, end, now < start ? "future" : "past", "month");
    },
  },
  {
    source:
      "\\b(?:n?o\\s+)?(?:in[íi]cio|come[çc]o)\\s+d[oe]\\s+m[êe]s\\b|\\b(?:at\\s+the\\s+)?(?:beginning|start)\\s+of\\s+(?:the\\s+)?month\\b",
    build: (_match, now) => {
      const start = startOfMonth(now);
      const end = new Date(start);
      end.setDate(MONTH_OPENING_DAY);
      return clock(start, endOfDay(end), now > end ? "past" : "future", "month");
    },
  },
  // ── Fuzzy ───────────────────────────────────────────────────────────────────────────────────
  {
    source: "\\brecentemente\\b|\\brecently\\b",
    build: (_match, now) =>
      clock(startOfDay(shift(now, -RECENTLY_DAYS, "day")), now, "past", "fuzzy"),
  },
  // ── Named against something that happened ───────────────────────────────────────────────────
  {
    source: `\\b(?:depois|desde)\\s+que\\s+(?:eu\\s+)?comecei\\s+(?:[oa]s?\\s+)?(?:projeto\\s+)?(${NAME})`,
    build: (match, now) => named(match[1], "start", now),
  },
  {
    source: `\\b(?:after|since)\\s+I\\s+started\\s+(?:the\\s+)?(?:project\\s+)?(${NAME})`,
    build: (match, now) => named(match[1], "start", now),
  },
  {
    source: `\\bdesde\\s+(?:[oa]s?\\s+)?(?:projeto\\s+)?(${NAME})`,
    build: (match, now) => named(match[1], "start", now),
  },
  {
    source: `\\bsince\\s+(?:the\\s+)?(?:project\\s+)?(${NAME})`,
    build: (match, now) => named(match[1], "start", now),
  },
  {
    source: `\\bantes\\s+d[oa]s?\\s+(?:projeto\\s+)?(${NAME})`,
    build: (match, now) => named(match[1], "end", now),
  },
  {
    source: `\\bbefore\\s+(?:the\\s+)?(?:project\\s+)?(${NAME})`,
    build: (match, now) => named(match[1], "end", now),
  },
];

const COMPILED = MATCHERS.map(({ source, build }) => ({
  pattern: new RegExp(source, "giu"),
  build,
}));

/**
 * Every span the content names, earliest first. One phrase yields one span: a matcher never re-reads
 * what an earlier, more specific one already claimed.
 *
 * `naquela época` is deliberately absent. It is unanchored — without a second anchor in the same
 * sentence it names no stretch of time, and a span echo invented is one the reader cannot correct.
 */
export const detectPeriods = (content: string, now: Date): DetectedPeriod[] => {
  const claimed: { start: number; end: number }[] = [];
  const found: DetectedPeriod[] = [];

  for (const { pattern, build } of COMPILED) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const at = match.index ?? 0;
      const to = at + match[0].length;
      if (claimed.some((range) => at < range.end && to > range.start)) continue;

      const built = build(match as RegExpExecArray, now);
      if (!built) continue;

      claimed.push({ start: at, end: to });
      found.push({ ...built, text: match[0].trim(), index: at });
    }
  }

  return found.sort((a, b) => a.index - b.index);
};

export const periodInternals = { startOfDay, endOfDay, startOfWeek, startOfMonth, spanOf, shift };
