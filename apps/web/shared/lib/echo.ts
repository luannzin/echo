import type { Echo } from "@echo/core";
import { EMBEDDING_DIMENSIONS, type EmbedderStatus } from "@echo/embeddings";
import { createVectorIndex } from "@echo/search";
import { createWorkerEmbedder } from "@/shared/lib/embedder";
import { createRetrieval, type Retrieval } from "@/shared/lib/retrieval";

/** Notes still waiting to be embedded; 0 means the derived data has caught up. */
export type AnalysisState = { pending: number; failed: boolean; error?: string };

export type EchoRuntime = Echo & {
  retrieval: Retrieval;
  onAnalysis: (listener: (state: AnalysisState) => void) => () => void;
  onModel: (listener: (status: EmbedderStatus) => void) => () => void;
};

let pending: Promise<EchoRuntime> | undefined;

/** Browser composition root. The database ships WebAssembly, so it is imported lazily. */
export const getEcho = (): Promise<EchoRuntime> => {
  if (!pending) pending = open();
  return pending;
};

const open = async (): Promise<EchoRuntime> => {
  const [{ createAnalyzer, createEcho }, { openBrowserRepositories }] = await Promise.all([
    import("@echo/core"),
    import("@echo/db/browser"),
  ]);
  const { repositories, lexical } = await openBrowserRepositories();
  const echo = createEcho({ repositories });
  const embedder = createWorkerEmbedder();

  // Every vector, resident for the life of the session: they are derived, bounded by the note count,
  // and re-reading them per query was the most expensive thing the app did. Filling it is not
  // something the notes wait for, and loading merges rather than replaces so a fresh vector is never
  // overwritten by an older read still in flight.
  const index = createVectorIndex(EMBEDDING_DIMENSIONS);
  void repositories.embeddings
    .list(embedder.id)
    .then((stored) => {
      for (const entry of stored)
        if (!index.has(entry.noteId)) index.put(entry.noteId, entry.values);
    })
    .catch((cause) => console.error("[echo] vectors could not be read:", cause));

  const listeners = new Set<(state: AnalysisState) => void>();
  /** The first pass starts before the UI can subscribe, so the latest state is replayed. */
  let latest: AnalysisState = { pending: 0, failed: false };

  const analyzer = createAnalyzer({
    notes: repositories.notes,
    embeddings: repositories.embeddings,
    embedder,
    events: echo.events,
    onEmbedded: ({ noteId, values }) => index.put(noteId, values),
    onProgress: (state) => {
      latest = state;
      if (state.error) console.error("[echo] analysis failed:", state.error);
      for (const listener of listeners) listener(state);
    },
  });

  // A deleted note's vector would go on matching questions about a note that is gone.
  echo.events.subscribe((event) => {
    if (event.type === "note.deleted") index.remove(event.noteId);
  });

  void embedder.warm?.();
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
};

/**
 * Opening the database means fetching several megabytes of WebAssembly. Starting that at module load
 * rather than in the first effect overlaps it with hydration.
 */
if (typeof window !== "undefined") void getEcho().catch(() => {});
