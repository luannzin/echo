import { z } from "zod";

/**
 * What the reader looked at. Deliberately not a `LearningEvent`: a correction is an opinion about
 * something echo inferred and rules are derived from it, while a visit is only a fact about where
 * someone has been. Filing them together would let walking around the app teach echo things nobody
 * said.
 */
export const observationSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  /**
   * `project_seen` is a folder or category the reader opened; `note_opened` is a note they read.
   * The second exists so echo can tell which notes go together for this reader when nothing about
   * their text says so — that is a fact about how they work, and it is still not an opinion.
   */
  type: z.enum(["project_seen", "note_opened"]),
  /** What was looked at: a folder id, a category id, a note id. */
  subject: z.string().min(1),
  at: z.date(),
});

export type Observation = z.infer<typeof observationSchema>;
export type ObservationType = Observation["type"];
