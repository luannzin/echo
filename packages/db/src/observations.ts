import type { ObservationRepository } from "@echo/core";
import type { ObservationType } from "@echo/types";
import { desc, eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import { observations } from "./schema";

export const createObservationRepository = (db: Database): ObservationRepository => {
  return {
    async record(observation) {
      await db.insert(observations).values(observation);
    },

    /**
     * The newest visit per subject. Grouped in the database rather than by reading the log, because
     * the log is append-only and the question is always about its last row.
     */
    async lastSeen(type: ObservationType) {
      const rows = await db
        .select({ subject: observations.subject, at: sql<Date>`max(${observations.at})` })
        .from(observations)
        .where(eq(observations.type, type))
        .groupBy(observations.subject);

      return new Map(rows.map((row) => [row.subject, new Date(row.at)]));
    },

    /**
     * The tail of the log. Which notes get read together is a question about lately, and a lifetime
     * of it would be read on every startup to answer the same thing.
     */
    async recent(type: ObservationType, limit = 2000) {
      const rows = await db
        .select()
        .from(observations)
        .where(eq(observations.type, type))
        .orderBy(desc(observations.at))
        .limit(limit);

      return rows.map((row) => ({ ...row, type: row.type as ObservationType }));
    },
  };
};
