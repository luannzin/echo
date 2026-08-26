import type { LexicalSearch } from "@echo/core";
import type { EmbedderStatus } from "@echo/embeddings";
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

export type SearchContext = {
  /** The notes already in memory. Retrieval never re-reads what the screen is holding. */
  notes: Note[];
  /** 0..1, what this reader has opened before. */
  affinityOf: (noteId: string) => number;
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
}: {
  lexical: LexicalSearch;
  embedder: WorkerEmbedder;
  index: VectorIndex;
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
     * `receive` is called once with what the words alone found, and again with the full blend when
     * meaning arrives. It is never called with fewer results than the pass before it found.
     */
    search: async (
      query: string,
      { notes, affinityOf, limit = 8 }: SearchContext,
      receive: (pass: SearchPass) => void,
    ): Promise<void> => {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        receive({ results: [], stage: "meaning" });
        return;
      }

      const byId = new Map(notes.map((note) => [note.id, note]));
      const words = new Map(
        (await lexical.search(trimmed, CANDIDATES)).map((match) => [match.noteId, match.rank]),
      );

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
