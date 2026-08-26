import { PGlite, type PGliteInterface } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * The client is passed in rather than built here whenever the host has one already. In the browser
 * that host is a worker: PGlite is WebAssembly and every query it runs is main-thread work unless
 * something moves it, and a database that can block a keystroke is not a local-first database.
 *
 * `dataDir` follows PGlite conventions: `idb://echo` in the browser, a path on disk under Tauri,
 * omitted for an in-memory database in tests.
 */
export function createDatabase(source?: string | PGliteInterface): Database {
  const client = typeof source === "string" || source === undefined ? new PGlite(source) : source;
  return drizzle(client as PGlite, { schema });
}
