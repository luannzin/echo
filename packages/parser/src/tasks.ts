export type DetectedTask = {
  /** The line as written, minus the marker that gave it away. */
  text: string;
  /** How strongly the line reads as something to do. Checkboxes are certain; phrasing is not. */
  confidence: number;
};

const CHECKBOX = /^\s*[-*+]\s*\[( |x|X)\]\s*/;
const INTENT_MARKERS: { pattern: RegExp; confidence: number }[] = [
  { pattern: /^\s*todo\b:?\s*/i, confidence: 0.95 },
  { pattern: /\b(i\s+)?need\s+to\b/i, confidence: 0.8 },
  { pattern: /\b(i\s+)?have\s+to\b/i, confidence: 0.8 },
  { pattern: /\bpreciso\s+(de\s+)?/i, confidence: 0.8 },
  { pattern: /\btenho\s+que\b/i, confidence: 0.8 },
  { pattern: /\bnao\s+esquecer\b|\bnão\s+esquecer\b/i, confidence: 0.75 },
  { pattern: /\bremember\s+to\b/i, confidence: 0.75 },
  { pattern: /\blembrar\s+de\b/i, confidence: 0.75 },
  { pattern: /\bshould\s+(finish|ship|send|write|fix|review|call)\b/i, confidence: 0.6 },
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
      tasks.push({ text: trimmed.replace(CHECKBOX, "").trim(), confidence: 1 });
      continue;
    }

    const marker = INTENT_MARKERS.find(({ pattern }) => pattern.test(trimmed));
    if (marker) {
      tasks.push({
        text: trimmed.replace(marker.pattern, "").trim(),
        confidence: marker.confidence,
      });
    }
  }

  return tasks;
}
