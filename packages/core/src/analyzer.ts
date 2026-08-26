import type { Embedder } from "@echo/embeddings";
import { detectMentions } from "@echo/parser";
import type { Clock } from "./clock";
import type { EventBus } from "./events";
import type { EmbeddingRepository, NoteRepository, TemporalRepository } from "./ports";

/**
 * Derived data catches up with the notes, never runs in front of them, and a failure costs a retry
 * on the next pass. Batched because a model pays a fixed cost per call — small on purpose, so
 * progress stays visible and a failure costs a few notes rather than all of them.
 */
const BATCH = 8;

/** Reading time needs no model, so it may take bigger bites than embedding does. */
const TEMPORAL_BATCH = 64;

export const createAnalyzer = ({
  notes,
  embeddings,
  temporal,
  embedder,
  events,
  now,
  onEmbedded,
  onProgress,
}: {
  notes: NoteRepository;
  embeddings: EmbeddingRepository;
  /** What each note says about time. Absent, the temporal pass simply does not run. */
  temporal?: TemporalRepository;
  embedder: Embedder;
  events: EventBus;
  now?: Clock;
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

  let temporalPass: Promise<void> | undefined;
  let temporalQueued = false;

  /**
   * What each note says about time, read on its own queue. Deliberately independent of the pass
   * above: parsing needs no model, so a fresh install has a working timeline long before the first
   * vector exists — and a model that never loads never holds it up.
   *
   * Mentions are stored exactly as the note said them. A span named against a project keeps its
   * anchor unresolved, because when that project started is a fact about the corpus rather than
   * about this note.
   */
  const drainTemporal = (): Promise<void> => {
    if (!temporal) return Promise.resolve();
    temporalQueued = true;
    temporalPass ??= (async () => {
      try {
        while (temporalQueued) {
          temporalQueued = false;
          const pending = await temporal.pending(TEMPORAL_BATCH);
          if (pending.length === 0) break;

          for (const noteId of pending) {
            const note = await notes.get(noteId);
            if (!note) continue;
            const at = now?.() ?? new Date();
            // The note is read as of the moment it is read: "amanhã" means the day after the pass,
            // and re-reading an edited note re-reads it against the new day.
            await temporal.put(noteId, detectMentions(note.content, at), at);
          }
        }
      } catch (cause) {
        // Same contract as the pass above: the queue is the database, so the work is still there.
        onProgress?.({
          pending: 0,
          failed: true,
          error: cause instanceof Error ? cause.message : String(cause),
        });
      } finally {
        temporalPass = undefined;
      }
    })();
    return temporalPass;
  };

  const unsubscribe = events.subscribe((event) => {
    if (event.type === "note.created" || event.type === "note.updated") {
      void drain();
      void drainTemporal();
    }
  });

  return {
    /** Catches up on everything outstanding — new notes, edited notes, a changed model. */
    run: async (): Promise<void> => {
      await Promise.all([drain(), drainTemporal()]);
    },
    stop: unsubscribe,
  };
};
