import type { LexicalSearch } from "@echo/core";
import type { EmbedderStatus } from "@echo/embeddings";
import { foldTerm, type PhraseModel, type VocabularyModel } from "@echo/learning";
import {
  type Destination,
  RELATED_SIMILARITY,
  rank,
  type SearchResult,
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

export type SearchContext = {
  /** The notes already in memory. Retrieval never re-reads what the screen is holding. */
  notes: Note[];
  /** 0..1, what this reader has opened before. */
  affinityOf: (noteId: string) => number;
  /**
   * Whether echo may still treat two of the reader's words as the same thing. A pairing the reader
   * has rejected goes quiet; nothing here can invent one, because the notes are the evidence.
   */
  aliasAllowed?: (a: string, b: string) => boolean;
  limit?: number;
};

/** Which signals an answer had available. The interface says so rather than implying more. */
export type SearchStage = "words" | "meaning";

export type SearchPass = { results: SearchResult[]; stage: SearchStage };

export type Retrieval = ReturnType<typeof createRetrieval>;

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
      { notes, affinityOf, aliasAllowed, limit = 8 }: SearchContext,
      receive: (pass: SearchPass) => void,
    ): Promise<void> => {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        receive({ results: [], stage: "meaning" });
        return;
      }

      const byId = new Map(notes.map((note) => [note.id, note]));

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

      const passes = await Promise.all([
        lexical.search(trimmed, CANDIDATES),
        // The trailing word swapped for the other spelling. A slice rather than a replace: `term`
        // is by construction the tail of the query, and building a pattern out of what someone
        // typed is a habit worth not having.
        ...alsoCalled.map((other) =>
          lexical.search(`${trimmed.slice(0, trimmed.length - term.length)}${other}`, CANDIDATES),
        ),
      ]);

      const words = new Map<string, number>();
      for (const [pass, matches] of passes.entries()) {
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
            },
          ];
        });

        return rank(candidates, { limit, minimumSemantic: RELATED_SIMILARITY });
      };

      receive({ results: blend(undefined), stage: "words" });

      const embedding = await queryVector(trimmed);
      if (!embedding) return;
      receive({ results: blend(embedding), stage: "meaning" });
    },

    /**
     * Where this note probably belongs, decided by where the notes nearest it already live. A note
     * that has already been read is its own query, so a whole Inbox costs one lookup each.
     */
    destinations: async (
      text: string,
      {
        notes,
        excludeNoteId,
        weightOf,
      }: { notes: Note[]; excludeNoteId?: string; weightOf?: (folderId: string) => number },
    ): Promise<Destination[]> => {
      if (index.size === 0) return [];
      const embedding =
        (excludeNoteId === undefined ? undefined : index.vectorOf(excludeNoteId)) ??
        (await queryVector(text));
      if (!embedding) return [];

      const byId = new Map(notes.map((note) => [note.id, note]));
      const neighbours = index
        .nearest(embedding, { excludeNoteId, limit: VOTERS, minimumSimilarity: VOTER_SIMILARITY })
        .map((match) => ({
          noteId: match.noteId,
          folderId: byId.get(match.noteId)?.folderId ?? null,
          similarity: match.similarity,
        }));

      return suggestDestinations(neighbours, { weightOf });
    },

    /** The notes closest in meaning to what is open or being written. */
    related: async (
      text: string,
      {
        notes,
        excludeNoteId,
        limit = 4,
      }: { notes: Note[]; excludeNoteId?: string; limit?: number },
    ): Promise<SearchResult[]> => {
      if (text.trim().length < 12 || index.size === 0) return [];
      const embedding = await queryVector(text);
      if (!embedding) return [];

      const byId = new Map(notes.map((note) => [note.id, note]));
      return index
        .nearest(embedding, { excludeNoteId, limit, minimumSimilarity: RELATED_SIMILARITY })
        .flatMap((match) => {
          const note = byId.get(match.noteId);
          if (!note) return [];
          return [{ note, score: match.similarity, semantic: match.similarity, lexical: 0 }];
        });
    },
  };
};
