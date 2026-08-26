import { STOPWORDS } from "./stopwords";

const MIN_LENGTH = 3;
const DEFAULT_LIMIT = 8;
const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu;

/**
 * Frequency ranking over the words that carry meaning. Ties break alphabetically so the same note
 * always produces the same list — derived data has to be reproducible.
 */
export const extractKeywords = (content: string, limit = DEFAULT_LIMIT): string[] => {
  const counts = new Map<string, number>();

  for (const [word] of content.matchAll(WORD)) {
    const normalized = word.toLowerCase();
    const folded = normalized.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (folded.length < MIN_LENGTH || STOPWORDS.has(folded) || /^\d+$/.test(folded)) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([wordA, countA], [wordB, countB]) => countB - countA || wordA.localeCompare(wordB))
    .slice(0, limit)
    .map(([word]) => word);
};
