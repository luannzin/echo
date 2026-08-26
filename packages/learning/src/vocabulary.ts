import { STOPWORDS } from "@echo/parser";

/**
 * The reader's own vocabulary, worked out from the reader's own notes. No taxonomy, no ontology and
 * no model: which words they use, which words they use *near* each other, and which words they use
 * in the same places.
 *
 * That last one is the whole trick behind personal aliases. Two terms are the same thing to this
 * reader when they turn up in the same company — `prod`, `production` and `produção` share their
 * neighbours; so do `HEREZE` and `Deadlands`. Terms that merely co-occur are *not* aliases:
 * `machine` and `learning` are always together and are never each other. Comparing contexts tells
 * those two cases apart; counting co-occurrence alone does not.
 */

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu;

/** Below this a word is a fragment, not a term. */
const MIN_LENGTH = 3;
/** A word written in one note is that note's word. Two notes is the first sign of a vocabulary. */
const MIN_NOTES = 2;
/**
 * How many notes a word needs before echo will claim another word means the same thing.
 *
 * Higher than everything else here, and deliberately. Saying two of someone's words are one word is
 * the strongest claim in this file, and a profile built from two notes is not a profile — on a thin
 * corpus half the vocabulary keeps the same company, and no threshold tells the half apart. Below
 * this, echo says nothing rather than guessing, which is the same bargain the rest of the learning
 * engine makes: one correction is a coincidence.
 */
const ALIAS_NOTES = 3;
/**
 * How many of a note's terms take part in the co-occurrence count. Every pair of them is counted, so
 * this is quadratic — twenty terms is a hundred and ninety pairs, which is the ceiling per note.
 *
 * ponytail: a long note contributes its strongest twenty terms rather than all of them. Raise it if
 * aliases ever come out thin on a corpus of long documents.
 */
const TERMS_PER_NOTE = 20;
/**
 * How much of the vocabulary is compared when looking for aliases. Sorted by how many notes carry
 * the term, so this keeps the reader's actual words and drops the ones written twice ever.
 *
 * ponytail: a linear scan over this many sparse profiles, which is a few milliseconds and runs when
 * a reader asks rather than as they type. An index earns its place above roughly ten thousand terms.
 */
const COMPARED = 2000;
/** Below this, two words share some company by accident rather than by meaning. */
const ALIAS_SIMILARITY = 0.4;
/**
 * How many words the two must both be written near before the score means anything. Two sparse
 * profiles overlapping on a single common word score high and say nothing — which is how `prod` and
 * `funcionar` came out as the same thing on a corpus that had only ever put `cache` beside both.
 */
const SHARED_CONTEXT = 3;
/**
 * How much of the smaller term's notes the two may share before they are companions rather than
 * substitutes.
 *
 * This carries almost all the weight, and it is the only thing that does. Similarity alone cannot
 * separate `prod ~ production` from `prod ~ estável`: measured over a real corpus the *noise* scores
 * higher, because a word that turns up beside all three spellings keeps better company with each of
 * them than they keep with each other. What actually distinguishes a synonym is that it is the word
 * the reader reaches for *instead* — so the two hardly ever share a note, while a word merely
 * written near them shares nearly all of them.
 *
 * Not zero: someone writes "HEREZE (aka Deadlands)" once, and one such note must not cost the pair
 * forever. A sixth is "almost never" with room for the sentence that introduces them.
 *
 * ponytail: this rule reads opposites as synonyms, and correctly by its own lights — `estável` and
 * `quebrou` occupy the same slot and are never written together, which is exactly the shape of a
 * substitute. Telling them apart needs something that knows what the words mean, and echo has no
 * such thing on purpose. It stays because what is on offer is "you may also mean", which the reader
 * refuses with one press, and because the alternative is offering nothing at all.
 */
const COMPANIONS = 0.15;
/** How many notes a term keeps, for averaging into a vector. Enough to be a sample, not a scan. */
const SAMPLED_NOTES = 24;
/** Two terms whose notes point elsewhere are not each other, whatever their contexts say. */
const SEMANTIC_FLOOR = 0.6;
/**
 * How far down the other word's own list this one may sit and still count. Being each other's
 * synonym is a claim about both, so it has to hold from both ends: on a small corpus plenty of words
 * keep company like `prod` does, but only `production` and `produção` have company like `prod`
 * *and* count `prod` among the words closest to them.
 */
const MUTUAL = 4;

export type VocabularyModel = {
  /** One note's words, added to what echo knows about how this reader writes. */
  learn: (noteId: string, text: string) => void;
  /** The same words taken back out, so editing a note corrects the counts instead of doubling them. */
  unlearn: (noteId: string, text: string) => void;
  /**
   * What a piece of writing is about, in the reader's own words. Ranked by how much the term stands
   * out in this note against how ordinary it is across the corpus — so `the` never wins, and neither
   * does a word every note carries.
   */
  conceptsOf: (text: string, limit?: number) => string[];
  /** Terms the reader tends to write in the same note. `cache` finds `memoization`. */
  relatedTo: (term: string, limit?: number) => string[];
  /**
   * Terms the reader uses in the same places — their own synonyms, in their own spelling. This is
   * what makes `HEREZE` and `Deadlands` retrieve one another.
   */
  aliasesOf: (term: string, limit?: number) => string[];
  /** How many notes have been read, which is what "ordinary" is measured against. */
  readonly notes: number;
  readonly terms: number;
};

/** Accents and case removed: `produção` and `producao` are one word to the person writing them. */
export const foldTerm = (term: string): string =>
  term.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const significant = (folded: string): boolean =>
  folded.length >= MIN_LENGTH && !STOPWORDS.has(folded) && !/^\d+$/.test(folded);

/**
 * Cosine between two sparse profiles, with the two terms themselves left out of both.
 *
 * Leaving them in is what made every word near `HEREZE` look like a synonym for it: `merchant`
 * carries `HEREZE` in its company and `HEREZE` carries `merchant` in its own, so the two profiles
 * agreed about each other and nothing else. What is being asked is whether they keep the *same*
 * company, which is a question about everyone else.
 *
 * The smaller profile is walked, so the cost is its size rather than the vocabulary's.
 */
const cosine = (a: Map<string, number>, b: Map<string, number>, left: string, right: string) => {
  let shared = 0;
  const lengthOf = (profile: Map<string, number>) => {
    let sum = 0;
    for (const [term, weight] of profile) {
      if (term !== left && term !== right) sum += weight * weight;
    }
    return Math.sqrt(sum);
  };

  const normA = lengthOf(a);
  const normB = lengthOf(b);
  if (normA === 0 || normB === 0) return 0;

  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, weight] of small) {
    if (term === left || term === right) continue;
    const against = large.get(term) ?? 0;
    if (against > 0) shared += 1;
    dot += weight * against;
  }
  return shared < SHARED_CONTEXT ? 0 : dot / (normA * normB);
};

export type VocabularyOptions = {
  /**
   * A note's embedding, when there is one. Aliases are gated on it: two terms with similar company
   * whose notes are about different things are a coincidence of phrasing.
   *
   * Left out, the model works on words alone — which is what a fresh install has before the model
   * has downloaded, and it is right rather than merely available.
   */
  vectorOf?: (noteId: string) => Float32Array | undefined;
};

export const createVocabulary = ({ vectorOf }: VocabularyOptions = {}): VocabularyModel => {
  /** Folded term → how many notes carry it. */
  const documents = new Map<string, number>();
  /** Folded term → the spelling the reader uses most, so nothing is shown back to them folded. */
  const spelling = new Map<string, Map<string, number>>();
  /** Folded term → the terms it shares notes with, and how often. */
  const company = new Map<string, Map<string, number>>();
  /** Folded term → some of the notes carrying it, for averaging into a vector. */
  const carriers = new Map<string, string[]>();
  let noteCount = 0;

  const bump = (counts: Map<string, number>, key: string, by: number): void => {
    const next = (counts.get(key) ?? 0) + by;
    if (next > 0) counts.set(key, next);
    else counts.delete(key);
  };

  /** The strongest terms of one note, deduped: a word repeated is still one note's word. */
  const termsOf = (text: string): { folded: string; written: string }[] => {
    const counts = new Map<string, { written: string; count: number }>();
    for (const [word] of text.matchAll(WORD)) {
      const folded = foldTerm(word);
      if (!significant(folded)) continue;
      const held = counts.get(folded);
      if (held) held.count += 1;
      else counts.set(folded, { written: word, count: 1 });
    }
    return [...counts.entries()]
      .sort(([a, x], [b, y]) => y.count - x.count || a.localeCompare(b))
      .slice(0, TERMS_PER_NOTE)
      .map(([folded, held]) => ({ folded, written: held.written }));
  };

  const count = (noteId: string, text: string, by: number): void => {
    const terms = termsOf(text);
    if (terms.length === 0) {
      noteCount = Math.max(0, noteCount + by);
      return;
    }
    noteCount = Math.max(0, noteCount + by);

    for (const { folded, written } of terms) {
      bump(documents, folded, by);
      if (documents.has(folded)) {
        const spellings = spelling.get(folded) ?? new Map<string, number>();
        bump(spellings, written, by);
        if (spellings.size > 0) spelling.set(folded, spellings);
        else spelling.delete(folded);
      } else {
        spelling.delete(folded);
        company.delete(folded);
        carriers.delete(folded);
      }

      const held = carriers.get(folded) ?? [];
      if (by > 0) {
        if (held.length < SAMPLED_NOTES && !held.includes(noteId)) held.push(noteId);
      } else {
        const at = held.indexOf(noteId);
        if (at >= 0) held.splice(at, 1);
      }
      if (held.length > 0) carriers.set(folded, held);
      else carriers.delete(folded);
    }

    // Every pair, both ways, so a profile can be read from either end without a second lookup.
    for (const { folded: a } of terms) {
      if (!documents.has(a)) continue;
      const profile = company.get(a) ?? new Map<string, number>();
      for (const { folded: b } of terms) {
        if (a !== b) bump(profile, b, by);
      }
      if (profile.size > 0) company.set(a, profile);
      else company.delete(a);
    }
  };

  const written = (folded: string): string => {
    const spellings = spelling.get(folded);
    if (!spellings) return folded;
    let best = folded;
    let bestCount = 0;
    for (const [word, seen] of spellings) {
      if (seen > bestCount || (seen === bestCount && word < best)) {
        best = word;
        bestCount = seen;
      }
    }
    return best;
  };

  /** How ordinary a word is. A term in every note says nothing about the note it is in. */
  const rarity = (folded: string): number => {
    const seen = documents.get(folded) ?? 0;
    if (seen === 0) return 0;
    return Math.log((noteCount + 1) / seen);
  };

  /** A term's direction in meaning: the average of the notes that carry it. */
  const termVector = (folded: string): Float32Array | undefined => {
    if (!vectorOf) return undefined;
    const notes = carriers.get(folded) ?? [];
    let sum: Float32Array | undefined;
    let taken = 0;
    for (const noteId of notes) {
      const vector = vectorOf(noteId);
      if (!vector) continue;
      if (!sum) sum = new Float32Array(vector.length);
      for (let at = 0; at < vector.length; at++)
        sum[at] = (sum[at] as number) + (vector[at] as number);
      taken += 1;
    }
    if (!sum || taken === 0) return undefined;
    let length = 0;
    for (const value of sum) length += value * value;
    length = Math.sqrt(length);
    if (length === 0) return undefined;
    for (let at = 0; at < sum.length; at++) sum[at] = (sum[at] as number) / length;
    return sum;
  };

  const pointsTheSameWay = (a: string, b: string): boolean => {
    const left = termVector(a);
    const right = termVector(b);
    // No vectors yet is not a reason to refuse: on a fresh install the words are all there is.
    if (!left || !right || left.length !== right.length) return true;
    let dot = 0;
    for (let at = 0; at < left.length; at++) dot += (left[at] as number) * (right[at] as number);
    return dot >= SEMANTIC_FLOOR;
  };

  /** The vocabulary worth comparing: the reader's real words, commonest first. */
  const compared = (): string[] =>
    [...documents.entries()]
      .filter(([, seen]) => seen >= MIN_NOTES)
      .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
      .slice(0, COMPARED)
      .map(([folded]) => folded);

  return {
    learn: (noteId, text) => count(noteId, text, 1),
    unlearn: (noteId, text) => count(noteId, text, -1),

    get notes() {
      return noteCount;
    },

    get terms() {
      return documents.size;
    },

    conceptsOf(text, limit = 4) {
      const counts = new Map<string, number>();
      for (const [word] of text.matchAll(WORD)) {
        const folded = foldTerm(word);
        if (significant(folded)) counts.set(folded, (counts.get(folded) ?? 0) + 1);
      }

      return (
        [...counts.entries()]
          // A word this corpus has only ever seen here is a typo as often as it is an idea.
          .filter(([folded]) => (documents.get(folded) ?? 0) >= MIN_NOTES)
          .map(([folded, seen]) => ({ folded, score: seen * rarity(folded) }))
          .sort((a, b) => b.score - a.score || a.folded.localeCompare(b.folded))
          .slice(0, limit)
          .map((held) => written(held.folded))
      );
    },

    relatedTo(term, limit = 4) {
      const folded = foldTerm(term);
      const profile = company.get(folded);
      if (!profile) return [];

      return (
        [...profile.entries()]
          .filter(([other, together]) => together >= MIN_NOTES && other !== folded)
          // Shared notes weighed against how ordinary the other word is, so a term that turns up
          // everywhere never wins by turning up here too.
          .map(([other, together]) => ({ other, score: together * rarity(other) }))
          .sort((a, b) => b.score - a.score || a.other.localeCompare(b.other))
          .slice(0, limit)
          .map((held) => written(held.other))
      );
    },

    aliasesOf(term, limit = 3) {
      const folded = foldTerm(term);
      // Being in each other's shortlist is the test, so both sides are worked out the same way.
      const shortlist = (of: string, take: number): string[] => {
        const seen = documents.get(of) ?? 0;
        const profile = company.get(of);
        if (!profile || seen < ALIAS_NOTES) return [];

        const found: { other: string; similarity: number }[] = [];
        for (const other of compared()) {
          if (other === of) continue;
          const against = company.get(other);
          if (!against) continue;

          // Words the reader writes together are companions, not substitutes. A synonym is the word
          // they reach for *instead*, so the two hardly ever share a note.
          const together = profile.get(other) ?? 0;
          if (together / Math.min(seen, documents.get(other) ?? 1) >= COMPANIONS) continue;

          const similarity = cosine(profile, against, of, other);
          if (similarity < ALIAS_SIMILARITY) continue;
          found.push({ other, similarity });
        }

        return found
          .sort((a, b) => b.similarity - a.similarity || a.other.localeCompare(b.other))
          .slice(0, take)
          .map((held) => held.other);
      };

      return shortlist(folded, limit + MUTUAL)
        .filter((other) => shortlist(other, MUTUAL).includes(folded))
        .filter((other) => pointsTheSameWay(folded, other))
        .slice(0, limit)
        .map(written);
    },
  };
};

/**
 * The key a correction about a pair of words is filed under. Sorted and folded, so `prod ≈ produção`
 * and `produção ≈ prod` are one belief rather than two that could disagree.
 */
export const aliasKey = (a: string, b: string): string =>
  [foldTerm(a), foldTerm(b)].sort().join("|");
