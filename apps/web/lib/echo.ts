import type { Echo, LexicalSearch, StoredEmbedding } from "@echo/core";
import { createWorkerEmbedder } from "@/lib/embedder";

/**
 * Browser composition root. PGlite ships WebAssembly, so it is imported lazily and only in the
 * browser — the server render never touches it.
 */
export type EchoRuntime = Echo & {
  lexical: LexicalSearch;
  embeddings: { list: () => Promise<StoredEmbedding[]> };
  embedQuery: (text: string) => Promise<Float32Array>;
  /** Notes still waiting to be embedded; 0 means the derived data has caught up. */
  onAnalysis: (
    listener: (state: { pending: number; failed: boolean; error?: string }) => void,
  ) => () => void;
};

let pending: Promise<EchoRuntime> | undefined;

export function getEcho(): Promise<EchoRuntime> {
  if (!pending) {
    pending = (async () => {
      const [{ createAnalyzer, createEcho }, { openRepositories }] = await Promise.all([
        import("@echo/core"),
        import("@echo/db"),
      ]);
      const { repositories, lexical } = await openRepositories("idb://echo");
      const echo = createEcho({ repositories });
      const embedder = createWorkerEmbedder();

      type AnalysisState = { pending: number; failed: boolean; error?: string };
      const listeners = new Set<(state: AnalysisState) => void>();
      // The first pass starts before the UI can subscribe, so the latest state is kept and replayed
      // to whoever asks next — otherwise a listener joins mid-work and sees nothing at all.
      let latest: AnalysisState = { pending: 0, failed: false };
      const analyzer = createAnalyzer({
        notes: repositories.notes,
        embeddings: repositories.embeddings,
        embedder,
        events: echo.events,
        onProgress: (state) => {
          latest = state;
          if (state.error) console.error("[echo] analysis failed:", state.error);
          for (const listener of listeners) listener(state);
        },
      });
      // Catch up on anything written before this session, without blocking it.
      void analyzer.run();

      return {
        ...echo,
        lexical,
        embeddings: { list: () => repositories.embeddings.list(embedder.id) },
        embedQuery: (text) => embedder.embedQuery(text),
        onAnalysis: (listener) => {
          listener(latest);
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
    })();
  }
  return pending;
}
