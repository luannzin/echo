import * as chrono from "chrono-node";

export type DetectedDate = {
  /** The words that produced the date, exactly as the writer typed them. */
  text: string;
  date: Date;
  /** A deadline was framed as a limit ("before Friday"); a date was merely mentioned. */
  kind: "deadline" | "date";
};

/** Words that turn a mentioned date into a limit to work against. */
const DEADLINE_MARKERS =
  /\b(before|by|due|until|till|deadline|ate|prazo|antes\s+de|antes\s+da|antes\s+do)\s*$/i;

/**
 * Portuguese runs first so numeric dates read day-first (`03/12` is 3 December), which is how the
 * writer's locale — and most of the world — writes them. English then covers what it misses.
 */
const PARSERS = [chrono.pt.casual, chrono.en.casual];

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Finds dates a person actually writes: "tomorrow", "before Friday", "até sexta", "12/03",
 * "in two weeks". `now` is injected, so the same note always parses the same way.
 */
export function detectDates(content: string, now: Date): DetectedDate[] {
  const claimed: { start: number; end: number }[] = [];
  const found: DetectedDate[] = [];

  for (const parser of PARSERS) {
    for (const result of parser.parse(content, now, { forwardDate: true })) {
      const start = result.index;
      const end = start + result.text.length;
      // One phrase, one date: a later parser never re-reads what an earlier one already claimed.
      if (claimed.some((range) => start < range.end && end > range.start)) continue;
      claimed.push({ start, end });

      found.push({
        text: result.text,
        date: result.start.date(),
        kind: DEADLINE_MARKERS.test(fold(content.slice(0, start))) ? "deadline" : "date",
      });
    }
  }

  return found.sort((a, b) => a.date.getTime() - b.date.getTime());
}
