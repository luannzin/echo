import type { LearnedRule } from "@echo/learning";
import type { ParseResult } from "@echo/parser";

/** Under this, echo has been told often enough that it should stop mentioning it. */
export const WORTH_SAYING = 0.4;

export type Signal = {
  kind: "task-phrase" | "deadline-phrase";
  /** The phrase that gave it away — what a correction is filed under. */
  trigger: string;
  label: string;
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
      label: "Task",
      tone: "bg-brand-bright",
      detected: task.confidence,
    });
  }

  // Only a deadline earns a chip. A date merely mentioned stays quiet.
  if (parsed.deadline?.marker) {
    signals.push({
      kind: "deadline-phrase",
      trigger: parsed.deadline.marker,
      label: `Due ${parsed.deadline.text}`,
      tone: "bg-warning",
      detected: 0.8,
    });
  }

  return signals;
};

export const signalKey = (signal: Signal): string => `${signal.kind}:${signal.trigger}`;

/** The reason behind a suggestion, in the reader's own words rather than a score. */
export const explain = (signal: Signal, rule: LearnedRule | undefined): string => {
  const meaning = signal.kind === "task-phrase" ? "something to do" : "a limit to work against";
  const read =
    signal.trigger === "checkbox"
      ? "A ticked box reads as something to do."
      : `“${signal.trigger}” reads as ${meaning}.`;

  if (!rule) return read;
  const times = rule.support === 1 ? "once" : `${rule.support} times`;
  return rule.outcome === "accept"
    ? `${read} You have agreed ${times}.`
    : `${read} You have said otherwise ${times}, so echo is less sure.`;
};
