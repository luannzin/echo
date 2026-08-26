import type { Repositories } from "@echo/core";
import type { PGliteInterface } from "@electric-sql/pglite";
import { createDatabase, type Database } from "./client";
import { createEmbeddingRepository } from "./embeddings";
import { createFolderRepository } from "./folders";
import { createLearningRepository } from "./learning";
import { migrate } from "./migrate";
import { createNoteRepository } from "./notes";
import { createLexicalSearch } from "./search";

export * as schema from "./schema";
export type { Database };
export { createDatabase, migrate };

/**
 * Opens the database, brings the schema up to date, and returns the repository set.
 *
 * `source` is a PGlite data directory, or a client that is already running — which is how the web
 * app hands over the one living in its worker.
 */
export async function openRepositories(source?: string | PGliteInterface): Promise<{
  db: Database;
  repositories: Repositories;
  lexical: ReturnType<typeof createLexicalSearch>;
}> {
  const db = createDatabase(source);
  await migrate(db);
  return {
    db,
    repositories: {
      notes: createNoteRepository(db),
      folders: createFolderRepository(db),
      embeddings: createEmbeddingRepository(db),
      learning: createLearningRepository(db),
    },
    lexical: createLexicalSearch(db),
  };
}
