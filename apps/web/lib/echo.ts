import type { Echo } from "@echo/core";
import { EMBEDDING_DIMENSIONS, type EmbedderStatus } from "@echo/embeddings";
import { createVectorIndex } from "@echo/search";
import { createWorkerEmbedder } from "@/lib/embedder";
import { createRetrieval, type Retrieval } from "@/lib/retrieval";

/** Notes still waiting to be embedded; 0 means the derived data has caught up. */
export type AnalysisState = { pending: number; failed: boolean; error?: string };

/**
 * Browser composition root. The database ships WebAssembly, so it is imported lazily and only in
 * the browser — the server render never touches it.
 */
export type EchoRuntime = Echo & {
  retrieval: Retrieval;
  onAnalysis: (listener: (state: AnalysisState) => void) => () => void;
  onModel: (listener: (status: EmbedderStatus) => void) => () => void;
};

let pending: Promise<EchoRuntime> | undefined;

export function getEcho(): Promise<EchoRuntime> {
  if (!pending) {
    pending = (async () => {
      const [{ createAnalyzer, createEcho }, { openBrowserRepositories }] = await Promise.all([
        import("@echo/core"),
        import("@echo/db/browser"),
      ]);
      // The database opens on its own thread. Nothing it does — a save, a search, reading the whole
      // vector table back — can cost the writing surface a frame.
      const { repositories, lexical } = await openBrowserRepositories();
      const echo = createEcho({ repositories });
      const embedder = createWorkerEmbedder();

      // Every vector, resident for the life of the session. Reading them back per query was the
      // single most expensive thing the app did; they are derived data, they are small, and holding
      // them is what makes relatedness a calculation rather than a round trip.
      //
      // Filling it is not something the notes wait for. At ten thousand notes that read is a second
      // of work, and none of it is needed until a semantic question is asked — so the app opens, the
      // notes appear, and the index arrives behind them. Anything embedded in the meantime is put
      // straight in, and loading merges rather than replaces so a fresh vector is never overwritten
      // by the older read that was already in flight.
      const index = createVectorIndex(EMBEDDING_DIMENSIONS);
      void repositories.embeddings
        .list(embedder.id)
        .then((stored) => {
          for (const entry of stored)
            if (!index.has(entry.noteId)) index.put(entry.noteId, entry.values);
        })
        .catch((cause) => console.error("[echo] vectors could not be read:", cause));

      const listeners = new Set<(state: AnalysisState) => void>();
      // The first pass starts before the UI can subscribe, so the latest state is kept and replayed
      // to whoever asks next — otherwise a listener joins mid-work and sees nothing at all.
      let latest: AnalysisState = { pending: 0, failed: false };
      const analyzer = createAnalyzer({
        notes: repositories.notes,
        embeddings: repositories.embeddings,
        embedder,
        events: echo.events,
        // A vector reaches the index the moment it is written, so a note becomes findable by meaning
        // as soon as it has been read — not on the next reload.
        onEmbedded: ({ noteId, values }) => index.put(noteId, values),
        onProgress: (state) => {
          latest = state;
          if (state.error) console.error("[echo] analysis failed:", state.error);
          for (const listener of listeners) listener(state);
        },
      });

      // A deleted note's vector would otherwise go on matching questions about a note that is gone.
      echo.events.subscribe((event) => {
        if (event.type === "note.deleted") index.remove(event.noteId);
      });

      // The weights start downloading now rather than on the first question, and nothing waits for
      // them: search answers from words until they arrive.
      void embedder.warm?.();
      // Catch up on anything written before this session, without blocking it.
      void analyzer.run();

      return {
        ...echo,
        retrieval: createRetrieval({ lexical, embedder, index }),
        onAnalysis: (listener) => {
          listener(latest);
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        onModel: (listener) => embedder.onStatus(listener),
      };
    })();
  }
  return pending;
}

/**
 * Opening the database means fetching and starting several megabytes of WebAssembly. Starting that
 * when the module loads rather than when the first effect runs overlaps it with hydration, which is
 * the difference between the note list arriving with the page and arriving after it.
 */
if (typeof window !== "undefined") void getEcho().catch(() => {});
