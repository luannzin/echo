import type { LearningEvent } from "@echo/types";

export type RuleKind = LearningEvent["kind"];

/**
 * What echo has worked out from a reader's corrections. A rule is always derived: delete every
 * event behind it and the rule is gone, which is what makes "forget this" a real promise rather
 * than a hidden flag somewhere.
 */
export type LearnedRule = {
  kind: RuleKind;
  /** The phrase or note id the rule is about. */
  subject: string;
  /** `kind` and `subject` together, for storing rules in a map or matching one by identity. */
  key: string;
  /** Which way the corrections point. */
  outcome: "accept" | "reject";
  /** 0..1. Two corrections the same way clear 0.6; one alone never does. */
  confidence: number;
  /** How many events stand behind it, before any decay. */
  support: number;
  lastSeen: Date;
};

export type DerivationOptions = {
  now?: Date;
  /** A correction from six weeks ago counts for a quarter of one from today. */
  halfLifeDays?: number;
};

/** How much each kind of event argues for or against the thing it is about. */
const DIRECTION: Record<LearningEvent["type"], number> = {
  signal_accepted: 1,
  signal_rejected: -1,
  duplicate_opened: 1,
  duplicate_dismissed: -1,
  result_opened: 1,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Below this, a rule is a coincidence. Two corrections the same way are the first real signal. */
export const CONFIDENT = 0.6;

export const ruleKey = (kind: RuleKind, subject: string): string => `${kind}:${subject}`;

/**
 * Corrections in, rules out — a pure function over the event list, called with whatever slice of
 * history the caller has. Recent corrections outweigh old ones, so a reader who changes their mind
 * is followed rather than argued with.
 */
export const deriveRules = (
  events: LearningEvent[],
  { now = new Date(), halfLifeDays = 30 }: DerivationOptions = {},
): LearnedRule[] => {
  const totals = new Map<string, { rule: LearnedRule; score: number }>();

  for (const event of events) {
    const key = ruleKey(event.kind, event.subject);
    const age = Math.max(0, now.getTime() - event.createdAt.getTime()) / DAY_MS;
    const weight = DIRECTION[event.type] * 2 ** (-age / halfLifeDays);

    const existing = totals.get(key);
    if (!existing) {
      totals.set(key, {
        score: weight,
        rule: {
          kind: event.kind,
          subject: event.subject,
          key,
          outcome: "accept",
          confidence: 0,
          support: 1,
          lastSeen: event.createdAt,
        },
      });
      continue;
    }

    existing.score += weight;
    existing.rule.support += 1;
    if (event.createdAt > existing.rule.lastSeen) existing.rule.lastSeen = event.createdAt;
  }

  return [...totals.values()]
    .map(({ rule, score }) => ({
      ...rule,
      outcome: score < 0 ? ("reject" as const) : ("accept" as const),
      // One correction lands at 0.5, two at 0.67, three at 0.75: confident, never certain.
      confidence: Math.abs(score) / (Math.abs(score) + 1),
    }))
    .filter((rule) => rule.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence || a.key.localeCompare(b.key));
};

export const ruleFor = (
  rules: LearnedRule[],
  kind: RuleKind,
  subject: string,
): LearnedRule | undefined => rules.find((rule) => rule.kind === kind && rule.subject === subject);

/**
 * What echo detected, adjusted by what this reader has taught it. A rule can only strengthen or
 * weaken a signal the parser already found — it never invents one, because an explicit reading of
 * the note outranks anything inferred from history.
 */
export const adjust = (base: number, rule: LearnedRule | undefined): number => {
  if (!rule || base <= 0) return base;
  return rule.outcome === "reject"
    ? base * (1 - rule.confidence)
    : base + (1 - base) * rule.confidence;
};

/**
 * How much a note has earned its place in results by being opened. Recency-weighted like everything
 * else here, and capped at 1 so no note can dominate ranking by being clicked often.
 */
export const affinity = (rules: LearnedRule[], noteId: string): number => {
  const rule = ruleFor(rules, "note", noteId);
  if (!rule || rule.outcome === "reject") return 0;
  return rule.confidence;
};

/** A duplicate warning the reader has already waved away, which must not come back. */
export const dismissed = (rules: LearnedRule[], noteId: string): boolean =>
  ruleFor(rules, "duplicate", noteId)?.outcome === "reject";
