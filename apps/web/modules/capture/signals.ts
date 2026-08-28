import { adjust, type LearnedRule, ruleFor } from "@echo/learning";
import type { ParseResult } from "@echo/parser";
import { copy } from "@/shared/lib/i18n";

/** Under this, echo has been told often enough that it should stop mentioning it. */
export const WORTH_SAYING = 0.4;

export type Signal = {
  kind: "task-phrase" | "deadline-phrase";
  /** The phrase that gave it away — what a correction is filed under. */
  trigger: string;
  /**
   * The writer's own words for the date, for a deadline; null for a task.
   *
   * Their words rather than a finished label, because the label around them is a sentence in
   * whatever language the interface is in, and this is read once per keystroke while that can
   * change underneath it.
   */
  text: string | null;
  /** Colour is meaning here: blue is echo's one accent, amber is time running out. */
  tone: string;
  /** What the parser thought, before anything this reader has taught echo. */
  detected: number;
};

/**
 * What echo noticed in what is being written, and nothing more. A signal is a read-out, not a
 * decision: nothing here changes the note, and every one can be told it is wrong.
 */
export const readSignals = (parsed: ParseResult): Signal[] => {
  const signals: Signal[] = [];
  const task = parsed.tasks[0];

  if (task) {
    signals.push({
      kind: "task-phrase",
      trigger: task.trigger,
      text: null,
      tone: "bg-brand-bright",
      detected: task.confidence,
    });
  }

  // A date framed as a limit is the strong reading; a date merely mentioned is the weak one. Both
  // get a chip, because both set the due date on whatever task comes out of this note, and a due
  // date nothing on screen mentions is one the writer has no way to tell echo is wrong.
  const when = parsed.deadline ?? parsed.dates[0];
  if (when) {
    signals.push({
      kind: "deadline-phrase",
      trigger: when.marker ?? "date",
      text: when.text,
      tone: "bg-warning",
      detected: when.marker ? 0.8 : 0.6,
    });
  }

  return signals;
};

/**
 * Whether echo acts on what it read. One threshold for saying it and for doing it: a suggestion the
 * interface shows but quietly declines to act on is one the writer cannot correct.
 */
export const believes = (signal: Signal, rules: LearnedRule[]): boolean =>
  adjust(signal.detected, ruleFor(rules, signal.kind, signal.trigger)) >= WORTH_SAYING;

export const signalKey = (signal: Signal): string => `${signal.kind}:${signal.trigger}`;

/** What the chip says. Read at render, so a language change repaints it. */
export const signalLabel = (signal: Signal): string =>
  signal.text === null ? copy().signals.task : copy().composer.due(signal.text);

/** The reason behind a suggestion, in the reader's own words rather than a score. */
export const explain = (signal: Signal, rule: LearnedRule | undefined): string => {
  const words = copy().signals;
  const meaning = signal.kind === "task-phrase" ? words.somethingToDo : words.aLimitToWork;
  const read =
    signal.trigger === "checkbox"
      ? words.tickedBox
      : signal.trigger === "date"
        ? words.dateIsDue
        : words.reads(signal.trigger, meaning);

  if (!rule) return read;
  const times = words.times(rule.support);
  return rule.outcome === "accept" ? words.agreed(read, times) : words.saidOtherwise(read, times);
};
