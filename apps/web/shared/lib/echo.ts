import type { Echo } from "@echo/core";
import { EMBEDDING_DIMENSIONS, type EmbedderStatus } from "@echo/embeddings";
import {
  createPhraseModel,
  createVocabulary,
  type PhraseModel,
  type VocabularyModel,
} from "@echo/learning";
import { createVectorIndex } from "@echo/search";
import { createWorkerEmbedder } from "@/shared/lib/embedder";
import { createTauriEmbedder } from "@/shared/lib/embedder.tauri";
import { createRetrieval, type Retrieval } from "@/shared/lib/retrieval";
import { isDesktopApp } from "@/shared/lib/tauri";

/** Notes still waiting to be embedded; 0 means the derived data has caught up. */
export type AnalysisState = { pending: number; failed: boolean; error?: string };

export type EchoRuntime = Echo & {
  retrieval: Retrieval;
  /** How this reader writes, for completing a sentence they have written before. */
  phrases: PhraseModel;
  /** Which words this reader uses, near which, and in place of which. */
  vocabulary: VocabularyModel;
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
  /**
   * Where the model runs is a fact about the engine, not a preference. WebKitGTK leaks tens of
   * megabytes per inference and never gives them back; the same model in the same loop is flat
   * under Chromium. So the desktop runs it natively and the website goes on running it in a worker,
   * which is the arrangement each engine can actually afford.
   */
  const embedder = isDesktopApp() ? createTauriEmbedder() : createWorkerEmbedder();

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

  /**
   * The reader's own phrases, learned from their own notes. Filled after the notes are on screen —
   * until it is, `complete` returns nothing, which is exactly what a new install should suggest.
   *
   * ponytail: one extra read of the corpus at startup, and a deleted note's phrases are left in
   * place because the event carries only an id. Both are worth revisiting if the model ever gets
   * expensive enough to be worth caching between sessions.
   */
  const phrases = createPhraseModel();
  /**
   * The reader's vocabulary, filled from the same read. Aliases are gated on the vector index, which
   * fills in the background — before it does, the words are all there is, and words alone are
   * already the right answer rather than merely the available one.
   */
  const vocabulary = createVocabulary({ vectorOf: (noteId) => index.vectorOf(noteId) });
  void repositories.notes
    .list({ limit: 1000 })
    .then((stored) => {
      for (const note of stored) {
        phrases.learn(note.content);
        vocabulary.learn(note.id, note.content);
      }
    })
    .catch((cause) => console.error("[echo] phrases could not be read:", cause));

  const listeners = new Set<(state: AnalysisState) => void>();
  /** The first pass starts before the UI can subscribe, so the latest state is replayed. */
  let latest: AnalysisState = { pending: 0, failed: false };

  const analyzer = createAnalyzer({
    notes: repositories.notes,
    embeddings: repositories.embeddings,
    // Reading time needs no model, so this pass runs on its own queue: a fresh install has a
    // working timeline long before the first vector exists.
    temporal: repositories.temporal,
    embedder,
    events: echo.events,
    onEmbedded: ({ noteId, values }) => index.put(noteId, values),
    onProgress: (state) => {
      latest = state;
      if (state.error) console.error("[echo] analysis failed:", state.error);
      for (const listener of listeners) listener(state);
    },
  });

  echo.events.subscribe((event) => {
    // A deleted note's vector would go on matching questions about a note that is gone.
    if (event.type === "note.deleted") index.remove(event.noteId);
    if (event.type === "note.created") {
      phrases.learn(event.note.content);
      vocabulary.learn(event.note.id, event.note.content);
    }
    // The previous text goes back out first: an edited note must correct the counts, not double them.
    if (event.type === "note.updated") {
      phrases.unlearn(event.previous.content);
      phrases.learn(event.note.content);
      vocabulary.unlearn(event.note.id, event.previous.content);
      vocabulary.learn(event.note.id, event.note.content);
    }
  });

  void embedder.warm?.();
  void analyzer.run();

  return {
    ...echo,
    retrieval: createRetrieval({ lexical, embedder, index, phrases, vocabulary }),
    phrases,
    vocabulary,
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
