import type { LearningRepository } from "@echo/core";
import type { LearningEvent } from "@echo/types";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "./client";
import { learningEvents } from "./schema";

export function createLearningRepository(db: Database): LearningRepository {
  return {
    async record(event) {
      await db.insert(learningEvents).values(event);
    },

    /**
     * Newest first, capped: rules are derived from what a reader has done lately, and reading a
     * lifetime of corrections to answer one keystroke would be the wrong trade.
     */
    async list(limit = 2000) {
      const rows = await db
        .select()
        .from(learningEvents)
        .orderBy(desc(learningEvents.createdAt))
        .limit(limit);

      return rows.map((row) => ({
        ...row,
        type: row.type as LearningEvent["type"],
        kind: row.kind as LearningEvent["kind"],
      }));
    },

    async forget(kind, subject) {
      await db
        .delete(learningEvents)
        .where(and(eq(learningEvents.kind, kind), eq(learningEvents.subject, subject)));
    },
  };
}
