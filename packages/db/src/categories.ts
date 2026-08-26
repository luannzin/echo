import type { CategoryPatch, CategoryRepository } from "@echo/core";
import type { CategorySource } from "@echo/types";
import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import { categories, noteCategories } from "./schema";

export const createCategoryRepository = (db: Database): CategoryRepository => ({
  async insert(category) {
    const [row] = await db.insert(categories).values(category).returning();
    if (!row) throw new Error("Insert returned no row");
    return row;
  },

  async update(id, patch: CategoryPatch) {
    const [row] = await db.update(categories).set(patch).where(eq(categories.id, id)).returning();
    if (!row) throw new Error(`Category ${id} not found`);
    return row;
  },

  async delete(id) {
    await db.delete(categories).where(eq(categories.id, id));
  },

  async findByName(name) {
    const [row] = await db
      .select()
      .from(categories)
      .where(sql`lower(${categories.name}) = lower(${name})`)
      .limit(1);
    return row ?? null;
  },

  list() {
    return db.select().from(categories).orderBy(asc(categories.name));
  },

  async assignments() {
    const rows = await db.select().from(noteCategories);
    return rows.map((row) => ({ ...row, source: row.source as CategorySource }));
  },

  /**
   * `user` wins, whichever arrives second. Echo re-reads a note every time it is edited, so without
   * this an inferred label would quietly overwrite one the reader had already stated. Two statements
   * rather than one upsert, because "explicit beats inferred" is a rule about which row survives and
   * that is not something a conflict clause says clearly.
   */
  async assign(assignment) {
    const where = and(
      eq(noteCategories.noteId, assignment.noteId),
      eq(noteCategories.categoryId, assignment.categoryId),
    );
    const [existing] = await db.select().from(noteCategories).where(where).limit(1);

    if (!existing) {
      await db.insert(noteCategories).values(assignment);
      return true;
    }
    // Already there. The only change worth making is a reader taking ownership of echo's guess.
    if (existing.source === assignment.source || assignment.source !== "user") return false;
    await db.update(noteCategories).set({ source: "user" }).where(where);
    return true;
  },

  async unassign(noteId, categoryId) {
    await db
      .delete(noteCategories)
      .where(and(eq(noteCategories.noteId, noteId), eq(noteCategories.categoryId, categoryId)));
  },
});
