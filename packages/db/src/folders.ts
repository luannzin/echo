import type { FolderRepository } from "@echo/core";
import { asc, eq } from "drizzle-orm";
import type { Database } from "./client";
import { folders } from "./schema";

export const createFolderRepository = (db: Database): FolderRepository => ({
  async insert(folder) {
    const [row] = await db.insert(folders).values(folder).returning();
    if (!row) throw new Error("Insert returned no row");
    return row;
  },

  async update(id, patch) {
    const [row] = await db.update(folders).set(patch).where(eq(folders.id, id)).returning();
    if (!row) throw new Error(`Folder ${id} not found`);
    return row;
  },

  async delete(id) {
    await db.delete(folders).where(eq(folders.id, id));
  },

  async get(id) {
    const [row] = await db.select().from(folders).where(eq(folders.id, id)).limit(1);
    return row ?? null;
  },

  list() {
    return db.select().from(folders).orderBy(asc(folders.name));
  },
});
