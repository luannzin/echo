import { z } from "zod";

/**
 * What a reader did about something echo inferred. These are the record; the rules echo works from
 * are derived out of them and can always be thrown away and rebuilt — the same relationship note
 * content has with embeddings.
 */
export const learningEventSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  type: z.enum([
    /** The reader confirmed a detected signal. */
    "signal_accepted",
    /** The reader said it was wrong. This is the correction the whole engine exists for. */
    "signal_rejected",
    /** A note offered as a possible duplicate turned out to be one. */
    "duplicate_opened",
    /** It did not, and echo should stop offering it. */
    "duplicate_dismissed",
    /** A note was opened from search or from the related panel — a vote for its usefulness. */
    "result_opened",
  ]),
  /**
   * Which family the subject belongs to, so two kinds of rule can never collide on one key. A
   * phrase learned about tasks says nothing about deadlines.
   */
  kind: z.enum(["task-phrase", "deadline-phrase", "note", "duplicate"]),
  /** What the event is about: the phrase that triggered a signal, or a note id. */
  subject: z.string().min(1),
  /** The note the reader was looking at, kept for the trail behind a "why". */
  noteId: z.uuid().nullable(),
  createdAt: z.date(),
});

export type LearningEvent = z.infer<typeof learningEventSchema>;

export const learningEventCreateSchema = learningEventSchema.omit({
  id: true,
  workspaceId: true,
  createdAt: true,
});

export type LearningEventCreate = z.input<typeof learningEventCreateSchema>;
