import type { Embedder } from "@echo/embeddings";
import type { EventBus } from "./events";
import type { EmbeddingRepository, NoteRepository } from "./ports";

/**
 * Derived data catches up with the notes, always behind them and never in front. Writing a note
 * finishes the moment it is stored; embedding it happens afterwards, one note at a time, and a
 * failure costs nothing but a retry on the next pass.
 */
export function createAnalyzer({
  notes,
  embeddings,
  embedder,
  events,
  onProgress,
}: {
  notes: NoteRepository;
  embeddings: EmbeddingRepository;
  embedder: Embedder;
  events: EventBus;
  onProgress?: (state: { pending: number; failed: boolean; error?: string }) => void;
}) {
  let current: Promise<void> | undefined;
  let queued = false;

  /**
   * One pass at a time, and a pass that is asked for while another is running extends it rather
   * than starting a second. Callers always get a promise that resolves when the queue is empty,
   * which is what makes the work testable.
   */
  function drain(): Promise<void> {
    queued = true;
    current ??= (async () => {
      try {
        while (queued) {
          queued = false;
          const pending = await embeddings.pending(embedder.id);
          if (pending.length === 0) break;
          onProgress?.({ pending: pending.length, failed: false });

          for (const noteId of pending) {
            const note = await notes.get(noteId);
            if (!note) continue;
            const values = await embedder.embed(`${note.title}\n\n${note.content}`);
            await embeddings.put({ noteId, model: embedder.id, values });
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
  }

  const unsubscribe = events.subscribe((event) => {
    if (event.type === "note.created" || event.type === "note.updated") void drain();
  });

  return {
    /** Catches up on everything outstanding — new notes, edited notes, a changed model. */
    run: drain,
    stop: unsubscribe,
  };
}
