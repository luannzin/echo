import type { Embedder } from "@echo/embeddings";
import type { EventBus } from "./events";
import type { EmbeddingRepository, NoteRepository } from "./ports";

/**
 * Derived data catches up with the notes, never runs in front of them, and a failure costs a retry
 * on the next pass. Batched because a model pays a fixed cost per call — small on purpose, so
 * progress stays visible and a failure costs a few notes rather than all of them.
 */
const BATCH = 8;

export const createAnalyzer = ({
  notes,
  embeddings,
  embedder,
  events,
  onEmbedded,
  onProgress,
}: {
  notes: NoteRepository;
  embeddings: EmbeddingRepository;
  embedder: Embedder;
  events: EventBus;
  /** Each vector as it is written, so anything holding an index can stay in step without re-reading. */
  onEmbedded?: (embedding: { noteId: string; values: Float32Array }) => void;
  onProgress?: (state: { pending: number; failed: boolean; error?: string }) => void;
}) => {
  let current: Promise<void> | undefined;
  let queued = false;

  /**
   * One pass at a time, and a pass that is asked for while another is running extends it rather
   * than starting a second. Callers always get a promise that resolves when the queue is empty,
   * which is what makes the work testable.
   */
  const drain = (): Promise<void> => {
    queued = true;
    current ??= (async () => {
      try {
        while (queued) {
          queued = false;
          const pending = await embeddings.pending(embedder.id);
          if (pending.length === 0) break;

          let remaining = pending.length;
          onProgress?.({ pending: remaining, failed: false });

          for (let start = 0; start < pending.length; start += BATCH) {
            const batch = pending.slice(start, start + BATCH);
            const loaded = (await Promise.all(batch.map((noteId) => notes.get(noteId)))).filter(
              (note) => note !== null,
            );
            if (loaded.length === 0) continue;

            const vectors = await embedder.embedMany(
              loaded.map((note) => `${note.title}\n\n${note.content}`),
            );

            for (const [offset, note] of loaded.entries()) {
              const values = vectors[offset];
              if (!values) continue;
              await embeddings.put({ noteId: note.id, model: embedder.id, values });
              onEmbedded?.({ noteId: note.id, values });
            }

            remaining -= batch.length;
            onProgress?.({ pending: Math.max(0, remaining), failed: false });
          }
        }
        onProgress?.({ pending: 0, failed: false });
      } catch (cause) {
        // The queue is derived from the notes themselves, so the work is still there next time —
        // but a silent failure would leave the panel looking merely empty, which is a lie.
        onProgress?.({
          pending: 0,
          failed: true,
          error: cause instanceof Error ? cause.message : String(cause),
        });
      } finally {
        current = undefined;
      }
    })();
    return current;
  };

  const unsubscribe = events.subscribe((event) => {
    if (event.type === "note.created" || event.type === "note.updated") void drain();
  });

  return {
    /** Catches up on everything outstanding — new notes, edited notes, a changed model. */
    run: drain,
    stop: unsubscribe,
  };
};
