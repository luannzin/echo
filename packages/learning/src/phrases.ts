import { STOPWORDS } from "@echo/parser";

/**
 * How this reader writes, learned from what they have already written. No model and no network: a
 * count of which words follow which, which is enough to finish a sentence someone has typed forty
 * times before — and honest about being nothing more than that.
 *
 * Everything here is built to be called on the keystroke itself. There is no debounce in front of
 * it, because a suggestion that arrives after the next character is a suggestion nobody reads.
 */

const WORD = /[\p{L}\p{N}'’_-]+/gu;
/** The partial word under the caret, which is what the next keystroke will finish. */
const TRAILING = /[\p{L}\p{N}'’_-]*$/u;

/** How many words a completion may offer at once. Past this it stops being a completion. */
const MAX_WORDS = 6;
/** A phrase written once is not a habit. */
const MIN_COUNT = 2;
/** How much of the time a continuation has to be the one, before echo will put it on screen. */
const MIN_SHARE = 0.34;
/** Each further word has to be more certain than the last, so a chain cannot drift into fiction. */
const SHARE_STEP = 0.08;
/** Below this, a prefix matches too much of the vocabulary to mean anything. */
const MIN_PREFIX = 2;
/** Vocabulary is bucketed by first letters, so completing a word never scans the whole corpus. */
const BUCKET = 2;
/**
 * ponytail: a long note contributes its opening rather than all of it. Bounded memory for an
 * unbounded corpus; if completions ever need the tail of long notes, this is the number to raise.
 */
const MAX_LEARNED_WORDS = 400;
/** Only the end of what is being written can be completed, so only the end has to be read. */
const TAIL_CHARS = 200;

/** Original spelling to how often it was written. Lookup keys are folded; what is offered is not. */
type Counts = Map<string, number>;

export type PhraseModel = {
  /** One note's words, added to what echo knows about the way this reader writes. */
  learn: (text: string) => void;
  /** The same words taken back out, so editing a note corrects the counts instead of doubling them. */
  unlearn: (text: string) => void;
  /**
   * What the reader is most likely about to write, or "" when echo has nothing worth saying.
   * The result is what would be appended to `text` exactly as it stands — including its own leading
   * space when one is needed.
   */
  complete: (text: string) => string;
  /**
   * The reader's own two-word phrases built around a term — "production cache", "cache
   * invalidation". Their vocabulary, not a taxonomy: what *they* say around this word.
   */
  phrasesFor: (term: string, limit?: number) => string[];
  /** How many distinct words echo has seen. Zero means there is nothing to suggest from yet. */
  readonly vocabulary: number;
};

const bump = (counts: Map<string, Counts>, key: string, word: string, by: number): void => {
  const bucket = counts.get(key) ?? new Map<string, number>();
  const next = (bucket.get(word) ?? 0) + by;
  if (next > 0) bucket.set(word, next);
  else bucket.delete(word);
  if (bucket.size > 0) counts.set(key, bucket);
  else counts.delete(key);
};

/** The most written word in a bucket, if it is written often enough and dominantly enough. */
const strongest = (bucket: Counts | undefined, share: number): string | null => {
  if (!bucket) return null;
  let best = "";
  let bestCount = 0;
  let total = 0;
  for (const [word, count] of bucket) {
    total += count;
    if (count > bestCount || (count === bestCount && word < best)) {
      best = word;
      bestCount = count;
    }
  }
  if (bestCount < MIN_COUNT || bestCount / total < share) return null;
  return best;
};

export const createPhraseModel = (): PhraseModel => {
  /** First letters → the words that start with them, so completing `conf` is one lookup. */
  const words = new Map<string, Counts>();
  /** One word → what tends to follow it. */
  const after = new Map<string, Counts>();
  /** And what tends to come before it, so a term can be grown in both directions. */
  const before = new Map<string, Counts>();
  /** Two words → what tends to follow them. Consulted first: more context, better answer. */
  const afterPair = new Map<string, Counts>();

  const tokenize = (text: string): string[] =>
    [...text.matchAll(WORD)].slice(0, MAX_LEARNED_WORDS).map(([word]) => word);

  const count = (text: string, by: number): void => {
    const tokens = tokenize(text);
    for (const [index, token] of tokens.entries()) {
      const folded = token.toLowerCase();
      if (folded.length >= BUCKET) bump(words, folded.slice(0, BUCKET), token, by);

      const one = tokens[index - 1]?.toLowerCase();
      if (one !== undefined) {
        bump(after, one, token, by);
        bump(before, folded, tokens[index - 1] as string, by);
      }
      const two = tokens[index - 2]?.toLowerCase();
      if (one !== undefined && two !== undefined) bump(afterPair, `${two} ${one}`, token, by);
    }
  };

  /** The next word after a context, preferring the longer context because it knows more. */
  const nextAfter = (context: string[], share: number): string | null => {
    const one = context[context.length - 1];
    if (one === undefined) return null;
    const two = context[context.length - 2];
    const pair = two === undefined ? null : strongest(afterPair.get(`${two} ${one}`), share);
    return pair ?? strongest(after.get(one), share);
  };

  /** Words, while each one is still more likely than not. Certainty is required to rise as it runs. */
  const chain = (context: string[]): string[] => {
    const running = [...context];
    const out: string[] = [];
    for (let step = 0; step < MAX_WORDS; step++) {
      const word = nextAfter(running, MIN_SHARE + SHARE_STEP * step);
      if (word === null) break;
      out.push(word);
      running.push(word.toLowerCase());
    }
    return out;
  };

  /** The most written word that starts with what has been typed and carries on past it. */
  const extend = (partial: string): string | null => {
    const folded = partial.toLowerCase();
    const bucket = words.get(folded.slice(0, BUCKET));
    if (!bucket) return null;

    let best: string | null = null;
    let bestCount = 0;
    for (const [word, seen] of bucket) {
      if (word.length <= partial.length || seen < MIN_COUNT) continue;
      if (!word.toLowerCase().startsWith(folded)) continue;
      if (seen > bestCount || (seen === bestCount && word < (best ?? ""))) {
        best = word;
        bestCount = seen;
      }
    }
    return best;
  };

  return {
    learn: (text) => count(text, 1),
    unlearn: (text) => count(text, -1),

    /**
     * Every word the reader habitually puts either side of this one, as phrases. Two words rather
     * than a chain: a chain produces the single most likely continuation, and the question here is
     * "which of these did you mean", which needs several answers rather than the best one.
     */
    phrasesFor(term, limit = 4) {
      const folded = term.toLowerCase();
      const found: { phrase: string; count: number }[] = [];

      // "do HEREZE" is not one of the reader's phrases, it is a preposition. A phrase offered back
      // as another way to ask the question has to carry a second word that means something.
      const carries = (word: string) =>
        !STOPWORDS.has(word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase());

      for (const [word, seen] of before.get(folded) ?? []) {
        if (seen >= MIN_COUNT && carries(word))
          found.push({ phrase: `${word} ${term}`, count: seen });
      }
      for (const [word, seen] of after.get(folded) ?? []) {
        if (seen >= MIN_COUNT && carries(word))
          found.push({ phrase: `${term} ${word}`, count: seen });
      }

      return found
        .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
        .slice(0, limit)
        .map((held) => held.phrase);
    },

    get vocabulary() {
      let total = 0;
      for (const bucket of words.values()) total += bucket.size;
      return total;
    },

    complete(text) {
      if (text.length === 0) return "";
      const tail = text.slice(-TAIL_CHARS);
      const partial = TRAILING.exec(tail)?.[0] ?? "";
      const preceding = tail.slice(0, tail.length - partial.length);
      const context = [...preceding.matchAll(WORD)].map(([word]) => word.toLowerCase());

      // Mid-word: finish the word first, and only then carry on past it. Nothing is offered for one
      // or two characters — at that length a prefix belongs to half the vocabulary.
      if (partial.length > 0) {
        if (partial.length < MIN_PREFIX) return "";
        const whole = extend(partial);
        if (whole !== null) {
          const rest = chain([...context, whole.toLowerCase()]);
          return whole.slice(partial.length) + (rest.length > 0 ? ` ${rest.join(" ")}` : "");
        }
        // The word is already finished, so what comes next is the suggestion.
        const rest = chain([...context, partial.toLowerCase()]);
        return rest.length > 0 ? ` ${rest.join(" ")}` : "";
      }

      // Between words. A line break ends a thought, and finishing someone's next thought for them
      // is a guess of a different order than finishing their sentence.
      if (!tail.endsWith(" ")) return "";
      const rest = chain(context);
      return rest.join(" ");
    },
  };
};
