import type { TaskRepository } from "@echo/core";
import { asc, eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import { tasks } from "./schema";

export function createTaskRepository(db: Database): TaskRepository {
  return {
    async insert(task) {
      const [row] = await db.insert(tasks).values(task).returning();
      if (!row) throw new Error("Insert returned no row");
      return row;
    },

    async update(id, patch) {
      const [row] = await db.update(tasks).set(patch).where(eq(tasks.id, id)).returning();
      if (!row) throw new Error(`Task ${id} not found`);
      return row;
    },

    async delete(id) {
      await db.delete(tasks).where(eq(tasks.id, id));
    },

    async get(id) {
      const [row] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
      return row ?? null;
    },

    list() {
      return (
        db
          .select()
          .from(tasks)
          // Dated first and soonest first, then everything undated by when it was written down.
          // `nulls last` is the whole reason this is ordered in SQL rather than in the view.
          .orderBy(sql`${tasks.dueAt} asc nulls last`, asc(tasks.createdAt))
      );
    },
  };
}
