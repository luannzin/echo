/**
 * A reduced stand-in for `@echo/parser`, so the hero's composer answers what a visitor actually
 * types into it.
 *
 * The site has no workspace dependencies and no reason to compile the domain, so this is a small
 * deterministic ruleset rather than the real thing: the application scores task phrasing and reads
 * dates through chrono in two languages, which is how it tells a deadline apart from a date merely
 * mentioned. What is shared is the behaviour a visitor is being shown: the phrase that gave a task
 * away is named, and one good signal is offered rather than three noisy ones.
 *
 * Keep this list short. A composer that finds a task in every sentence is the bug the real
 * threshold exists to prevent.
 */

/** Phrases the writer uses when they are promising themselves something, longest first. */
const TASK_PHRASES = [
  "don't forget",
  "remember to",
  "lembrar de",
  "tenho que",
  "needs to",
  "need to",
  "have to",
  "preciso",
  "deploy",
  "todo",
  "ship",
  "fix",
];

/** Words that name a day. The chip repeats the word the writer used, never a normalised date. */
const DATE_WORDS = [
  "day after tomorrow",
  "next week",
  "this week",
  "tomorrow",
  "tonight",
  "amanhã",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "today",
  "hoje",
];

const found = (text: string, candidates: string[]) => {
  const haystack = ` ${text.toLowerCase()} `;
  return candidates.find((candidate) => haystack.includes(` ${candidate}`)) ?? null;
};

export type Signal = { label: string; why: string };

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export const signalsFor = (text: string): Signal[] => {
  const signals: Signal[] = [];

  const box = /^\s*-?\s*\[\s?\]/.test(text);
  const phrase = found(text, TASK_PHRASES);
  if (box) {
    signals.push({ label: "Task", why: "a checkbox is not a guess" });
  } else if (phrase) {
    signals.push({ label: "Task", why: `the phrase “${phrase}” gave it away` });
  }

  const when = found(text, DATE_WORDS);
  if (when) {
    signals.push({ label: `Due ${when}`, why: "read from the note" });
  }

  return signals;
};
