import { z } from "zod";

export const noteSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  /** null means the note sits in the Inbox. */
  folderId: z.uuid().nullable(),
  title: z.string(),
  content: z.string(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Note = z.infer<typeof noteSchema>;

export const noteCreateSchema = z.object({
  /** Supplied when the interface already showed the note; omitted, one is generated. */
  id: z.uuid().optional(),
  folderId: z.uuid().nullable().default(null),
  content: z.string().default(""),
});

export type NoteCreate = z.input<typeof noteCreateSchema>;

export const noteUpdateSchema = z.object({
  content: z.string().optional(),
  folderId: z.uuid().nullable().optional(),
  archivedAt: z.date().nullable().optional(),
});

export type NoteUpdate = z.infer<typeof noteUpdateSchema>;
