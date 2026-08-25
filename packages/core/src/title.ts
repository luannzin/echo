const MAX_TITLE_LENGTH = 120;

/**
 * Titles are derived, never asked for: the first meaningful line of the note, with markdown heading
 * marks and list bullets stripped. An empty note has an empty title, and the UI shows "Untitled".
 */
export function deriveTitle(content: string): string {
  for (const line of content.split("\n")) {
    const text = line
      .replace(/^\s*#{1,6}\s+/, "")
      .replace(/^\s*[-*+]\s+(\[[ xX]\]\s+)?/, "")
      .replace(/^\s*>\s+/, "")
      .trim();
    if (text.length > 0) return text.slice(0, MAX_TITLE_LENGTH);
  }
  return "";
}
