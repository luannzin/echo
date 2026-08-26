import type { EmbeddingRepository, StoredEmbedding } from "@echo/core";
import { eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import { notes, noteVectors } from "./schema";

/**
 * Vectors are stored as the bytes the model produced. Nothing above this file knows that — the
 * repository takes and returns `Float32Array`, and how it reaches the disk is this file's business.
 */
export function createEmbeddingRepository(db: Database): EmbeddingRepository {
  return {
    async put(embedding) {
      const values = asBytes(embedding.values);
      await db
        .insert(noteVectors)
        .values({
          noteId: embedding.noteId,
          model: embedding.model,
          dimensions: embedding.values.length,
          values,
        })
        .onConflictDoUpdate({
          target: noteVectors.noteId,
          set: {
            model: embedding.model,
            dimensions: embedding.values.length,
            values,
            createdAt: new Date(),
          },
        });
    },

    async list(model) {
      const rows = await db
        .select({ noteId: noteVectors.noteId, values: noteVectors.values })
        .from(noteVectors)
        .where(eq(noteVectors.model, model));

      return rows.map((row) => ({
        noteId: row.noteId,
        model,
        values: asFloats(row.values),
      })) satisfies StoredEmbedding[];
    },

    /** Which notes still need a vector: new notes, edited notes, and notes from an older model. */
    async pending(model) {
      const rows = await db
        .select({ id: notes.id })
        .from(notes)
        .leftJoin(noteVectors, eq(noteVectors.noteId, notes.id))
        .where(
          sql`${noteVectors.noteId} is null or ${noteVectors.model} <> ${model} or ${noteVectors.createdAt} < ${notes.updatedAt}`,
        );
      return rows.map((row) => row.id);
    },
  };
}

function asBytes(values: Float32Array): Uint8Array {
  return new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
}

/**
 * Bytes back into floats. The view is taken over the stored buffer where the driver happens to have
 * aligned it to four bytes, and over a copy where it has not — a `Float32Array` cannot start at an
 * arbitrary offset, and a vector read wrongly is worse than a vector read slowly.
 */
function asFloats(stored: Uint8Array): Float32Array {
  if (stored.byteOffset % Float32Array.BYTES_PER_ELEMENT === 0) {
    return new Float32Array(
      stored.buffer,
      stored.byteOffset,
      stored.byteLength / Float32Array.BYTES_PER_ELEMENT,
    );
  }
  return new Float32Array(stored.slice().buffer);
}
