export type DetectedTask = {
  /** The line as written, minus the marker that gave it away. */
  text: string;
  /** How strongly the line reads as something to do. Checkboxes are certain; phrasing is not. */
  confidence: number;
  /**
   * The words that gave it away, folded to lower case — `need to`, `preciso`, or `checkbox` for a
   * box that was ticked. This is what a reader's corrections attach to: they are not teaching echo
   * about one note, they are teaching it about a phrase they use.
   */
  trigger: string;
};

const CHECKBOX = /^\s*[-*+]\s*\[( |x|X)\]\s*/;
/**
 * Each marker carries the name its corrections are filed under. The name is written down rather
 * than read off the match, so `need to` and `I need to` teach echo the same thing.
 *
 * Order is precedence: the first pattern that matches a line wins, so the explicit spellings sit
 * above the everyday ones. The everyday ones are the point — people write "eu quero fazer" and
 * "I'll send it" far more often than they write "TODO", and a reader who disagrees corrects the
 * phrase once and echo stops offering it.
 */
const INTENT_MARKERS: { pattern: RegExp; confidence: number; trigger: string }[] = [
  { pattern: /^\s*todo\b:?\s*/i, confidence: 0.95, trigger: "todo" },
  { pattern: /^\s*fazer\b:?\s*/i, confidence: 0.9, trigger: "fazer" },
  {
    pattern: /\b(don'?t|do\s+not)\s+forget\s+to\b/i,
    confidence: 0.85,
    trigger: "don't forget to",
  },
  { pattern: /\b(i\s+)?need\s+to\b/i, confidence: 0.8, trigger: "need to" },
  { pattern: /\b(i\s+)?have\s+to\b/i, confidence: 0.8, trigger: "have to" },
  { pattern: /\bpreciso\s+(de\s+)?/i, confidence: 0.8, trigger: "preciso" },
  { pattern: /\btenho\s+(que|de)\s+/i, confidence: 0.8, trigger: "tenho que" },
  { pattern: /\bmake\s+sure\s+(to|i)\b/i, confidence: 0.75, trigger: "make sure to" },
  {
    pattern: /\b(nao|não)\s+(posso\s+)?esquecer\s+(de\s+)?/i,
    confidence: 0.75,
    trigger: "não esquecer",
  },
  { pattern: /\bremember\s+to\b/i, confidence: 0.75, trigger: "remember to" },
  { pattern: /\blembrar\s+(de\s+)?/i, confidence: 0.75, trigger: "lembrar de" },
  { pattern: /\b(eu\s+)?(quero|queria)\s+(fazer\s+)?/i, confidence: 0.65, trigger: "quero" },
  { pattern: /\b(i\s+)?want\s+to\b/i, confidence: 0.65, trigger: "want to" },
  { pattern: /\b(eu\s+)?(devo|deveria)\s+/i, confidence: 0.65, trigger: "devo" },
  { pattern: /\b(i\s+)?(gotta|must)\s+/i, confidence: 0.65, trigger: "must" },
  { pattern: /\b(agendar|marcar)\s+/i, confidence: 0.6, trigger: "agendar" },
  { pattern: /^\s*falta\s+/i, confidence: 0.6, trigger: "falta" },
  {
    pattern:
      /\bshould\s+(finish|ship|send|write|fix|review|call|check|update|ask|book|buy|email|deploy|test|read)\b/i,
    confidence: 0.6,
    trigger: "should",
  },
  // The weakest readings, and the two most likely to be someone narrating rather than planning.
  // They stay in because "vou mandar o resumo" and "I'll send the summary" are how most people
  // actually write a task down — and one correction is enough to take either back out.
  { pattern: /\b(eu\s+)?vou\s+(?!ser\b|estar\b)/i, confidence: 0.55, trigger: "vou" },
  { pattern: /\b(i'?ll|i\s+will)\s+(?!be\b)/i, confidence: 0.55, trigger: "i'll" },
];

/**
 * Task intent, line by line. A checkbox is explicit and scores highest; phrasing is a suggestion,
 * never a decision — nothing here mutates the note.
 */
export const detectTasks = (content: string): DetectedTask[] => {
  const tasks: DetectedTask[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    if (CHECKBOX.test(trimmed)) {
      tasks.push({
        text: trimmed.replace(CHECKBOX, "").trim(),
        confidence: 1,
        trigger: "checkbox",
      });
      continue;
    }

    const marker = INTENT_MARKERS.find(({ pattern }) => pattern.test(trimmed));
    if (marker) {
      tasks.push({
        text: trimmed.replace(marker.pattern, "").trim(),
        confidence: marker.confidence,
        trigger: marker.trigger,
      });
    }
  }

  return tasks;
};
