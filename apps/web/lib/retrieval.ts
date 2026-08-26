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
import type { WorkerEmbedder } from "@/lib/embedder";

/** How many notes each half of the search may nominate before they are ranked together. */
const CANDIDATES = 60;

/**
 * How many neighbours vote on where a note belongs. Wider than the four shown as related, because
 * a vote wants a sample and a panel wants the best few — and looser, because a note that is only
 * loosely about the same thing still knows which drawer that thing lives in.
 */
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

export type SearchPass = {
  results: SearchResult[];
  stage: SearchStage;
};

export type Retrieval = ReturnType<typeof createRetrieval>;

/**
 * Retrieval, arranged so that nothing a reader does ever waits on the model.
 *
 * Search runs in two passes. The first is words alone — a lookup against the stored full-text index,
 * a few milliseconds, always available. The second adds meaning, and only happens once the model is
 * loaded and has answered. A reader on a fresh install sees results from the first keystroke and
 * watches them sharpen; a reader whose model failed to download sees the first pass and a plain
 * explanation, rather than an empty panel that looks like an answer.
 *
 * Vectors are compared in memory. `index` is the whole corpus, kept resident and patched as notes
 * are embedded, so relatedness costs a calculation instead of a query.
 */
export function createRetrieval({
  lexical,
  embedder,
  index,
}: {
  lexical: LexicalSearch;
  embedder: WorkerEmbedder;
  index: VectorIndex;
}) {
  /**
   * The query vector, if it can be had without waiting. A model that is still downloading is not a
   * reason to hold up an answer — it is a reason to answer with what is already known.
   */
  async function queryVector(text: string): Promise<Float32Array | undefined> {
    if (embedder.status().state !== "ready") {
      void embedder.warm?.();
      return undefined;
    }
    return embedder.embedQuery(text).catch(() => undefined);
  }

  return {
    index,

    status(): EmbedderStatus {
      return embedder.status();
    },

    /**
     * `receive` is called once with what the words alone found, and again with the full blend when
     * meaning arrives. It is never called with fewer results than the pass before it found.
     */
    async search(
      query: string,
      { notes, affinityOf, limit = 8 }: SearchContext,
      receive: (pass: SearchPass) => void,
    ): Promise<void> {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        receive({ results: [], stage: "meaning" });
        return;
      }

      const byId = new Map(notes.map((note) => [note.id, note]));
      const words = new Map(
        (await lexical.search(trimmed, CANDIDATES)).map((match) => [match.noteId, match.rank]),
      );

      /**
       * Only the notes one half or the other nominated. Ranking a whole corpus to return eight
       * results is work nobody asked for: a note that neither the words nor the meaning put forward
       * is not going to win on recency.
       */
      function blend(embedding: Float32Array | undefined): SearchResult[] {
        const nominated = new Set(words.keys());
        if (embedding) {
          for (const match of index.nearest(embedding, {
            limit: CANDIDATES,
            minimumSimilarity: RELATED_SIMILARITY,
          })) {
            nominated.add(match.noteId);
          }
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
      }

      receive({ results: blend(undefined), stage: "words" });

      const embedding = await queryVector(trimmed);
      if (!embedding) return;
      receive({ results: blend(embedding), stage: "meaning" });
    },

    /**
     * Where this note probably belongs, decided by where the notes nearest it already live. No
     * classifier and nothing trained: every suggestion is a handful of the reader's own notes, and
     * `because` names them, so the answer to "why here?" is a list of notes they can open.
     */
    async destinations(
      text: string,
      {
        notes,
        excludeNoteId,
        weightOf,
      }: { notes: Note[]; excludeNoteId?: string; weightOf?: (folderId: string) => number },
    ): Promise<Destination[]> {
      if (index.size === 0) return [];
      // A note that has already been read is its own query. Only a note echo has never seen has to
      // go through the model, which is why filing a hundred notes costs one lookup each.
      const embedding =
        (excludeNoteId === undefined ? undefined : index.vectorOf(excludeNoteId)) ??
        (await queryVector(text));
      if (!embedding) return [];

      const byId = new Map(notes.map((note) => [note.id, note]));
      const neighbours = index
        .nearest(embedding, {
          excludeNoteId,
          limit: VOTERS,
          minimumSimilarity: VOTER_SIMILARITY,
        })
        .map((match) => ({
          noteId: match.noteId,
          folderId: byId.get(match.noteId)?.folderId ?? null,
          similarity: match.similarity,
        }));

      return suggestDestinations(neighbours, { weightOf });
    },

    /**
     * The notes closest in meaning to what is open or being written. Purely a memory calculation
     * once the query is encoded — no query, no storage round trip, nothing to wait on but the model.
     */
    async related(
      text: string,
      {
        notes,
        excludeNoteId,
        limit = 4,
      }: { notes: Note[]; excludeNoteId?: string; limit?: number },
    ): Promise<SearchResult[]> {
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
}
