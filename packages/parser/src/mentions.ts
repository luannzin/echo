import { detectDates } from "./dates";
import { detectPeriods, type PeriodDirection, type PeriodGrain } from "./periods";

/**
 * Every stretch of time a note names, instants and spans in one list. This is the shape that gets
 * stored: an instant is the day it falls on, so one question — "what does this note point at, and
 * when" — has one answer rather than two lists to reconcile.
 */
export type Mention = {
  /** The words that produced it, exactly as written. */
  text: string;
  /** `null` is an open edge: unbounded, or supplied later by an anchor the corpus has to resolve. */
  start: Date | null;
  end: Date | null;
  /** A limit to work against, a date merely mentioned, or a stretch of time. */
  kind: "deadline" | "date" | "period";
  direction: PeriodDirection;
  grain: PeriodGrain;
  /** The name a span hangs off, when it was named against something rather than against the clock. */
  anchor: string | null;
  anchoredEdge: "start" | "end" | null;
};

const startOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const endOfDay = (date: Date): Date => {
  const end = startOfDay(date);
  end.setDate(end.getDate() + 1);
  return new Date(end.getTime() - 1);
};

/**
 * Spans are read before instants. "Semana que vem" is a week someone means to work through, not the
 * Monday chrono can also find inside it — and whichever is read first is the one that survives.
 */
export const detectMentions = (content: string, now: Date): Mention[] => {
  const claimed: { start: number; end: number }[] = [];
  const found: (Mention & { index: number })[] = [];

  for (const period of detectPeriods(content, now)) {
    claimed.push({ start: period.index, end: period.index + period.text.length });
    found.push({
      index: period.index,
      text: period.text,
      start: period.start,
      end: period.end,
      kind: "period",
      direction: period.direction,
      grain: period.grain,
      anchor: period.anchor,
      anchoredEdge: period.anchoredEdge,
    });
  }

  for (const date of detectDates(content, now)) {
    const to = date.index + date.text.length;
    if (claimed.some((range) => date.index < range.end && to > range.start)) continue;
    claimed.push({ start: date.index, end: to });
    found.push({
      index: date.index,
      text: date.text,
      start: startOfDay(date.date),
      end: endOfDay(date.date),
      kind: date.kind,
      direction: date.date.getTime() >= now.getTime() ? "future" : "past",
      grain: "day",
      anchor: null,
      anchoredEdge: null,
    });
  }

  return found.sort((a, b) => a.index - b.index).map(({ index: _index, ...mention }) => mention);
};
