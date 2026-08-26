import { type DetectedDate, detectDates } from "./dates";
import { extractKeywords } from "./keywords";
import { detectMentions, type Mention } from "./mentions";
import { type DetectedPeriod, detectPeriods } from "./periods";
import { type DetectedTask, detectTasks } from "./tasks";

export * from "./dates";
export * from "./keywords";
export * from "./mentions";
export * from "./numbers";
export * from "./periods";
export * from "./tasks";

export type ParseResult = {
  dates: DetectedDate[];
  /** The stretches of time the note names, as opposed to the instants. */
  periods: DetectedPeriod[];
  /** Both of the above in one list, which is the shape that gets stored. */
  mentions: Mention[];
  tasks: DetectedTask[];
  keywords: string[];
  /** The earliest deadline found, which is the one worth surfacing. */
  deadline: DetectedDate | null;
};

/**
 * Everything echo can tell about a note without a model, a network call, or an API key. Pure and
 * deterministic: same content plus same `now` gives the same result, every time.
 */
export const parse = (content: string, { now = new Date() }: { now?: Date } = {}): ParseResult => {
  const dates = detectDates(content, now);
  return {
    dates,
    periods: detectPeriods(content, now),
    mentions: detectMentions(content, now),
    tasks: detectTasks(content),
    keywords: extractKeywords(content),
    deadline: dates.find((date) => date.kind === "deadline") ?? null,
  };
};
