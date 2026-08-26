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
 */
const INTENT_MARKERS: { pattern: RegExp; confidence: number; trigger: string }[] = [
  { pattern: /^\s*todo\b:?\s*/i, confidence: 0.95, trigger: "todo" },
  { pattern: /\b(i\s+)?need\s+to\b/i, confidence: 0.8, trigger: "need to" },
  { pattern: /\b(i\s+)?have\s+to\b/i, confidence: 0.8, trigger: "have to" },
  { pattern: /\bpreciso\s+(de\s+)?/i, confidence: 0.8, trigger: "preciso" },
  { pattern: /\btenho\s+que\b/i, confidence: 0.8, trigger: "tenho que" },
  {
    pattern: /\bnao\s+esquecer\b|\bnão\s+esquecer\b/i,
    confidence: 0.75,
    trigger: "não esquecer",
  },
  { pattern: /\bremember\s+to\b/i, confidence: 0.75, trigger: "remember to" },
  { pattern: /\blembrar\s+de\b/i, confidence: 0.75, trigger: "lembrar de" },
  {
    pattern: /\bshould\s+(finish|ship|send|write|fix|review|call)\b/i,
    confidence: 0.6,
    trigger: "should",
  },
];

/**
 * Task intent, line by line. A checkbox is explicit and scores highest; phrasing is a suggestion,
 * never a decision — nothing here mutates the note.
 */
export function detectTasks(content: string): DetectedTask[] {
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
}
