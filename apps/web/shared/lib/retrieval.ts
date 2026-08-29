import {
  type Anchors,
  type CoOpens,
  type LexicalSearch,
  type ParsedQuery,
  type Place,
  parseQuery,
  togetherness,
} from "@echo/core";
import type { EmbedderStatus } from "@echo/embeddings";
import { foldTerm, type PhraseModel, type VocabularyModel } from "@echo/learning";
import {
  type ContextReason,
  type ContextSignals,
  contextScore,
  DEFAULT_WEIGHTS,
  type Destination,
  explainContext,
  overlap,
  RELATED_SIMILARITY,
  rank,
  type SearchResult,
  samePeriod,
  suggestDestinations,
  type VectorIndex,
} from "@echo/search";
import type { Note } from "@echo/types";
import type { WorkerEmbedder } from "@/shared/lib/embedder";

/** How many notes each half of the search may nominate before they are ranked together. */
const CANDIDATES = 60;

/** How many neighbours vote on where a note belongs — wider and looser than what is shown as related. */
const VOTERS = 12;
const VOTER_SIMILARITY = 0.4;

/** How many of the reader's own words are offered beside a question. Past this it is a menu. */
const SUGGESTIONS = 5;
/** How many other spellings of the word being searched are also searched for. */
const EXPANSIONS = 2;
/** How many neighbours meaning nominates per place shown, so belonging has something to re-order. */
const NOMINEES = 4;

/** A related note, and why it is one. The codes become sentences in the interface, not here. */
export type RelatedResult = SearchResult & { because: ContextReason[] };

/** One of the reader's own words or phrases, offered beside what they typed. */
export type Suggestion = {
  text: string;
  /** `alias` is another word for it, `phrase` is how they usually say it, `related` sits near it. */
  kind: "alias" | "phrase" | "related";
};

/** The word a reader is honing is the last one they have typed. */
const lastTerm = (query: string): string => {
  const words = query
    .trim()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  return words[words.length - 1] ?? "";
};

/** Everything retrieval needs to judge a note by more than its words. */
export type Surroundings = {
  /** A note's concepts and categories, by name. */
  conceptsOf?: (noteId: string) => readonly string[];
  /** Which notes this reader reads together. */
  together?: CoOpens;
  /** The note the reader is looking at, which is what "the same project" is the same as. */
  reference?: Note;
};

export type SearchContext = {
  /** The notes already in memory. Retrieval never re-reads what the screen is holding. */
  notes: Note[];
  /** 0..1, what this reader has opened before. */
  affinityOf: (noteId: string) => number;
  /** Every folder and category, so a question can name one. */
  places?: readonly Place[];
  /** Project start dates, for a question anchored to one. */
  anchors?: Anchors;
  /** Filters the reader has dropped. A chip they removed is a filter that does not apply. */
  ignoring?: ReadonlySet<"period" | "place">;
  /** Which categories each note carries, for applying a category filter. */
  categoriesOf?: (noteId: string) => readonly string[];
  surroundings?: Surroundings;
  /**
   * Whether echo may still treat two of the reader's words as the same thing. A pairing the reader
   * has rejected goes quiet; nothing here can invent one, because the notes are the evidence.
   */
  aliasAllowed?: (a: string, b: string) => boolean;
  limit?: number;
};

/** Which signals an answer had available. The interface says so rather than implying more. */
export type SearchStage = "words" | "meaning";

export type SearchPass = {
  results: SearchResult[];
  stage: SearchStage;
  /** How the question came apart, so the interface can show the filters and let them go. */
  query: ParsedQuery;
  /** How many notes the filters removed, so narrowing is never silent. */
  filtered: number;
};

export type Retrieval = ReturnType<typeof createRetrieval>;

/**
 * What a note has in common with what the reader is looking at, beyond the words. The reference is
 * whatever note they have open: searching from inside a project is a different question than
 * searching from nowhere, and with no reference every one of these is simply absent rather than
 * guessed at.
 */
const signalsFor = (note: Note, surroundings: Surroundings | undefined): ContextSignals => {
  const reference = surroundings?.reference;
  if (!reference || reference.id === note.id) return {};
  return {
    sameProject: reference.folderId !== null && reference.folderId === note.folderId,
    sharedConcepts: surroundings?.conceptsOf
      ? overlap(surroundings.conceptsOf(reference.id), surroundings.conceptsOf(note.id))
      : 0,
    samePeriod: samePeriod(reference.createdAt, note.createdAt),
    coOpened: surroundings?.together
      ? togetherness(surroundings.together, reference.id, note.id)
      : 0,
  };
};

/**
 * Retrieval, arranged so nothing a reader does ever waits on the model. Search runs in two passes:
 * words alone from the stored text index, then meaning once the model has answered. Vectors are
 * compared in memory, so relatedness costs a calculation instead of a query.
 */
export const createRetrieval = ({
  lexical,
  embedder,
  index,
  phrases,
  vocabulary,
}: {
  lexical: LexicalSearch;
  embedder: WorkerEmbedder;
  index: VectorIndex;
  phrases: PhraseModel;
  vocabulary: VocabularyModel;
}) => {
  /** The query vector, if it can be had without waiting. */
  const queryVector = async (text: string): Promise<Float32Array | undefined> => {
    if (embedder.status().state !== "ready") {
      void embedder.warm?.();
      return undefined;
    }
    return embedder.embedQuery(text).catch(() => undefined);
  };

  return {
    index,

    /** Which model wrote the vectors. Printed in settings, and nothing else reads it. */
    modelId: embedder.id,

    status: (): EmbedderStatus => embedder.status(),

    /**
     * The reader's own words for what they just typed — their spellings for it, the phrases they
     * build around it, and what they tend to write beside it. Their vocabulary, never a thesaurus:
     * every one of these came out of a note they wrote.
     */
    suggestions(query: string, allowed?: (a: string, b: string) => boolean): Suggestion[] {
      const term = lastTerm(query);
      if (term.length < 2) return [];
      const folded = foldTerm(term);

      const found: Suggestion[] = [
        ...vocabulary
          .aliasesOf(term, EXPANSIONS + 1)
          .filter((other) => allowed?.(term, other) ?? true)
          .map((text) => ({ text, kind: "alias" as const })),
        ...phrases.phrasesFor(term, 3).map((text) => ({ text, kind: "phrase" as const })),
        ...vocabulary.relatedTo(term, 3).map((text) => ({ text, kind: "related" as const })),
      ];

      const seen = new Set<string>([folded]);
      return found
        .filter((suggestion) => {
          const key = foldTerm(suggestion.text);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, SUGGESTIONS);
    },

    /**
     * `receive` is called once with what the words alone found, and again with the full blend when
     * meaning arrives. It is never called with fewer results than the pass before it found.
     */
    search: async (
      query: string,
      {
        notes,
        affinityOf,
        aliasAllowed,
        places = [],
        anchors,
        ignoring,
        categoriesOf,
        surroundings,
        limit = 8,
      }: SearchContext,
      receive: (pass: SearchPass) => void,
    ): Promise<void> => {
      /**
       * The question comes apart before anything is searched: a subject, a stretch of time, a place,
       * and the words that were only a way of asking. Every filter it finds is reported back with
       * the words it came from — narrowing that the reader cannot see is narrowing that hides their
       * answer from them.
       */
      const parsed = parseQuery(query, { places, anchors });
      const period = ignoring?.has("period") ? null : parsed.period;
      const place = ignoring?.has("place") ? null : parsed.place;
      // Once the filters are out, what is left is the question. Nothing is a question by itself.
      const trimmed = (parsed.terms || (period || place ? "" : query)).trim();

      /** Filters narrow rather than re-order, which only stays fair because each one is one press
       *  from gone in the interface above this. */
      const passes = (note: Note): boolean => {
        if (period) {
          const at = note.createdAt.getTime();
          if (period.from && at < period.from.getTime()) return false;
          if (period.to && at > period.to.getTime()) return false;
        }
        if (place?.kind === "folder" && note.folderId !== place.id) return false;
        if (place?.kind === "category" && !(categoriesOf?.(note.id) ?? []).includes(place.id)) {
          return false;
        }
        return true;
      };

      const allowed = period || place ? notes.filter(passes) : notes;
      const removed = notes.length - allowed.length;

      // A question that was only filters — "notes from last month" — is answered by the filters.
      if (trimmed.length === 0) {
        receive({
          results: allowed
            .slice(0, limit)
            .map((note) => ({ note, score: 0, semantic: 0, lexical: 0 })),
          stage: "meaning",
          query: parsed,
          filtered: removed,
        });
        return;
      }

      const byId = new Map(allowed.map((note) => [note.id, note]));

      /**
       * The reader's other spellings for the word they are looking for, searched alongside it. This
       * is what makes `HEREZE` find the notes that say `Deadlands` — not a thesaurus, and not the
       * model: two words this reader uses in the same places.
       *
       * A second indexed query rather than a widened one: the text index is a lookup, so asking it
       * twice costs less than teaching every caller to build an expanded tsquery.
       */
      const term = lastTerm(trimmed);
      const alsoCalled =
        term.length < 2
          ? []
          : vocabulary
              .aliasesOf(term, EXPANSIONS)
              .filter((other) => aliasAllowed?.(term, other) ?? true);

      const found = await Promise.all([
        lexical.search(trimmed, CANDIDATES),
        // The trailing word swapped for the other spelling. A slice rather than a replace: `term`
        // is by construction the tail of the query, and building a pattern out of what someone
        // typed is a habit worth not having.
        ...alsoCalled.map((other) =>
          lexical.search(`${trimmed.slice(0, trimmed.length - term.length)}${other}`, CANDIDATES),
        ),
      ]);

      const words = new Map<string, number>();
      for (const [pass, matches] of found.entries()) {
        for (const match of matches) {
          // The word actually typed outranks the word echo worked out is the same thing.
          const rank = pass === 0 ? match.rank : match.rank * 0.8;
          words.set(match.noteId, Math.max(words.get(match.noteId) ?? 0, rank));
        }
      }

      /** Only what one half or the other nominated: ranking a whole corpus for eight results is
       *  work nobody asked for. */
      const blend = (embedding: Float32Array | undefined): SearchResult[] => {
        const nominated = new Set(words.keys());
        if (embedding) {
          const near = index.nearest(embedding, {
            limit: CANDIDATES,
            minimumSimilarity: RELATED_SIMILARITY,
          });
          for (const match of near) nominated.add(match.noteId);
        }

        const candidates = [...nominated].flatMap((noteId) => {
          const note = byId.get(noteId);
          if (!note) return [];
          return [
            {
              note,
              semantic: embedding ? (index.scoreOf(embedding, noteId) ?? 0) : 0,
              lexical: words.get(noteId) ?? 0,
              interaction: affinityOf(noteId),
              context: surroundings?.reference ? contextScore(signalsFor(note, surroundings)) : 0,
            },
          ];
        });

        return rank(candidates, { limit, minimumSemantic: RELATED_SIMILARITY });
      };

      receive({ results: blend(undefined), stage: "words", query: parsed, filtered: removed });

      const embedding = await queryVector(trimmed);
      if (!embedding) return;
      receive({ results: blend(embedding), stage: "meaning", query: parsed, filtered: removed });
    },

    /**
     * Where this note probably belongs, decided by where the notes nearest it already live. A note
     * that has already been read is its own query, so a whole Inbox costs one lookup each.
     *
     * `folderOf` rather than the notes themselves: the Inbox asks this once per unfiled note, and
     * building a map of the whole corpus inside each of those calls made triage quadratic in a
     * corpus it only ever needed to read one way round. The caller arranges it once.
     */
    destinations: async (
      text: string,
      {
        folderOf,
        excludeNoteId,
        weightOf,
      }: {
        folderOf: (noteId: string) => string | null;
        excludeNoteId?: string;
        weightOf?: (folderId: string) => number;
      },
    ): Promise<Destination[]> => {
      if (index.size === 0) return [];
      const embedding =
        (excludeNoteId === undefined ? undefined : index.vectorOf(excludeNoteId)) ??
        (await queryVector(text));
      if (!embedding) return [];

      const neighbours = index
        .nearest(embedding, { excludeNoteId, limit: VOTERS, minimumSimilarity: VOTER_SIMILARITY })
        .map((match) => ({
          noteId: match.noteId,
          folderId: folderOf(match.noteId),
          similarity: match.similarity,
        }));

      return suggestDestinations(neighbours, { weightOf });
    },

    /**
     * The notes that belong with what is open or being written — which is not the same question as
     * the notes closest to it in meaning.
     *
     * A note can be almost exactly about the same words and still be the wrong note, while one that
     * says less of the same is the right one because it comes out of the same project, carries the
     * same concepts, was written in the same fortnight, and is the note this reader opens alongside
     * it every time. Meaning nominates; belonging orders.
     */
    related: async (
      text: string,
      {
        notes,
        excludeNoteId,
        surroundings,
        limit = 4,
      }: {
        notes: Note[];
        excludeNoteId?: string;
        surroundings?: Surroundings;
        limit?: number;
      },
    ): Promise<RelatedResult[]> => {
      if (text.trim().length < 12 || index.size === 0) return [];
      const embedding = await queryVector(text);
      if (!embedding) return [];

      const byId = new Map(notes.map((note) => [note.id, note]));
      // Wider than what is shown, because the ordering below is allowed to disagree with the
      // similarity that nominated them — and it cannot promote a note it was never handed.
      return index
        .nearest(embedding, {
          excludeNoteId,
          limit: limit * NOMINEES,
          minimumSimilarity: RELATED_SIMILARITY,
        })
        .flatMap((match) => {
          const note = byId.get(match.noteId);
          if (!note) return [];
          const signals = signalsFor(note, surroundings);
          return [
            {
              note,
              semantic: match.similarity,
              lexical: 0,
              // The same blend search uses, minus the halves a neighbourhood has no opinion on:
              // relatedness is about what a note is, not about when it was touched.
              score:
                match.similarity * DEFAULT_WEIGHTS.semantic +
                contextScore(signals) * DEFAULT_WEIGHTS.context,
              // Why it is here, as things the reader can check rather than as a number.
              because: explainContext(signals),
            },
          ];
        })
        .sort((a, b) => b.score - a.score || a.note.id.localeCompare(b.note.id))
        .slice(0, limit);
    },
  };
};
