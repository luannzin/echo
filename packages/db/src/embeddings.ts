import type { EmbeddingRepository, StoredEmbedding } from "@echo/core";
import { eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import { noteEmbeddings, notes } from "./schema";

export function createEmbeddingRepository(db: Database): EmbeddingRepository {
  return {
    async put(embedding) {
      await db
        .insert(noteEmbeddings)
        .values({
          noteId: embedding.noteId,
          model: embedding.model,
          dimensions: embedding.values.length,
          values: [...embedding.values],
        })
        .onConflictDoUpdate({
          target: noteEmbeddings.noteId,
          set: {
            model: embedding.model,
            dimensions: embedding.values.length,
            values: [...embedding.values],
            createdAt: new Date(),
          },
        });
    },

    async list(model) {
      const rows = await db
        .select({ noteId: noteEmbeddings.noteId, values: noteEmbeddings.values })
        .from(noteEmbeddings)
        .where(eq(noteEmbeddings.model, model));

      return rows.map((row) => ({
        noteId: row.noteId,
        model,
        values: Float32Array.from(row.values),
      })) satisfies StoredEmbedding[];
    },

    /** Which notes still need a vector: new notes, edited notes, and notes from an older model. */
    async pending(model) {
      const rows = await db
        .select({ id: notes.id })
        .from(notes)
        .leftJoin(noteEmbeddings, eq(noteEmbeddings.noteId, notes.id))
        .where(
          sql`${noteEmbeddings.noteId} is null or ${noteEmbeddings.model} <> ${model} or ${noteEmbeddings.createdAt} < ${notes.updatedAt}`,
        );
      return rows.map((row) => row.id);
    },
  };
}
