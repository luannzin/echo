import * as chrono from "chrono-node";
import { PT_RELATIVE } from "./relative-pt";

export type DetectedDate = {
  /** The words that produced the date, exactly as the writer typed them. */
  text: string;
  /** Where in the content it was found, so a span already read is never read a second time. */
  index: number;
  date: Date;
  /** A deadline was framed as a limit ("before Friday"); a date was merely mentioned. */
  kind: "deadline" | "date";
  /**
   * The word that framed it as a limit — `before`, `até`, `prazo` — folded to lower case, and null
   * for a date that was only mentioned. Corrections attach to this word rather than to the date.
   */
  marker: string | null;
};

/** Words that turn a mentioned date into a limit to work against. */
const DEADLINE_MARKERS =
  /\b(before|by|due|until|till|deadline|ate|prazo|antes\s+de|antes\s+da|antes\s+do)\s*$/i;

/**
 * Portuguese runs first so numeric dates read day-first (`03/12` is 3 December), which is how the
 * writer's locale — and most of the world — writes them. English then covers what it misses.
 */
const PARSERS = [withPortugueseOffsets(), chrono.en.casual];

function withPortugueseOffsets(): chrono.Chrono {
  const parser = chrono.pt.casual.clone();
  // Ahead of the built-ins: `daqui a 3 dias` matches chrono's clock parser too, and whichever
  // reads it first wins the span.
  parser.parsers.unshift(...PT_RELATIVE);
  return parser;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** How far back a bare `06/08` is still read as the one that just went by. */
const RECENT_PAST_MS = 30 * DAY_MS;

/**
 * `forwardDate` is right for a weekday — `sexta` means the one coming — and wrong for a date the
 * writer spelled out. Written on 26 August, `06/08` is three weeks gone, not eleven months away,
 * and a note-taker that silently books it for next year cannot be corrected, because nothing on
 * screen says it happened.
 *
 * ponytail: a 30-day grace window, which is what makes `05/01` written in December still mean
 * January. Per-writer tuning, if this ever reads wrong.
 */
const settleYear = (result: chrono.ParsedResult, now: Date): Date => {
  const date = result.start.date();
  if (result.start.isCertain("year")) return date;

  const lastYear = new Date(date);
  lastYear.setFullYear(date.getFullYear() - 1);
  const behind = now.getTime() - lastYear.getTime();
  return behind > 0 && behind <= RECENT_PAST_MS ? lastYear : date;
};

const fold = (text: string): string => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Finds dates a person actually writes: "tomorrow", "before Friday", "até sexta", "12/03",
 * "in two weeks". `now` is injected, so the same note always parses the same way.
 */
export const detectDates = (content: string, now: Date): DetectedDate[] => {
  const claimed: { start: number; end: number }[] = [];
  const found: DetectedDate[] = [];

  for (const parser of PARSERS) {
    for (const result of parser.parse(content, now, { forwardDate: true })) {
      // `3 d` is chrono's English abbreviation for three days, and it is also what `em 3 dias`
      // looks like two keystrokes in. A single-letter unit is never worth acting on: reading it
      // makes a chip appear, vanish at `3 di` and come back at `3 dia`, which is the interface
      // flickering at someone in the middle of a word.
      if (/^\d+\s*\p{L}$/u.test(result.text.trim())) continue;

      const start = result.index;
      const end = start + result.text.length;
      // One phrase, one date: a later parser never re-reads what an earlier one already claimed.
      if (claimed.some((range) => start < range.end && end > range.start)) continue;
      claimed.push({ start, end });

      const framing = DEADLINE_MARKERS.exec(fold(content.slice(0, start)));
      found.push({
        // chrono keeps the punctuation it swallowed; the interface shows this text verbatim.
        text: result.text.replace(/[\s,.;:]+$/, ""),
        index: start,
        date: settleYear(result, now),
        kind: framing ? "deadline" : "date",
        marker: framing ? framing[0].trim().replace(/\s+/g, " ") : null,
      });
    }
  }

  return found.sort((a, b) => a.date.getTime() - b.date.getTime());
};
