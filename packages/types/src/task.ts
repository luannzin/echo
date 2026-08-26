import { z } from "zod";

/**
 * Something to do, read out of a note the writer agreed to. A task always names its source: it is
 * an intention the note already contained, not a second list kept beside the notes — which is why
 * `noteId` is required and why deleting the note takes the task with it.
 */
export const taskSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  noteId: z.uuid(),
  title: z.string().min(1).max(500),
  /** When it is due, if the note said. A task without a date is still a task. */
  dueAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Task = z.infer<typeof taskSchema>;

export const taskCreateSchema = z.object({
  noteId: z.uuid(),
  title: taskSchema.shape.title,
  dueAt: z.date().nullable().default(null),
});

export type TaskCreate = z.input<typeof taskCreateSchema>;
