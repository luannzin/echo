import type { ObservationRepository } from "@echo/core";
import type { ObservationType } from "@echo/types";
import { eq, sql } from "drizzle-orm";
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
  };
};
