import type { Repositories } from "@echo/core";
import { createDatabase, type Database } from "./client";
import { createFolderRepository } from "./folders";
import { migrate } from "./migrate";
import { createNoteRepository } from "./notes";

export * as schema from "./schema";
export type { Database };
export { createDatabase, migrate };

/** Opens the database, brings the schema up to date, and returns the repository set. */
export async function openRepositories(
  dataDir?: string,
): Promise<{ db: Database; repositories: Repositories }> {
  const db = createDatabase(dataDir);
  await migrate(db);
  return {
    db,
    repositories: {
      notes: createNoteRepository(db),
      folders: createFolderRepository(db),
    },
  };
}
