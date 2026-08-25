import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * `dataDir` follows PGlite conventions: `idb://echo` in the browser, a path on disk under Tauri,
 * omitted for an in-memory database in tests.
 */
export function createDatabase(dataDir?: string): Database {
  return drizzle(new PGlite(dataDir), { schema });
}
