import { z } from "zod";

/**
 * A label that can sit on any note, and any number of them on one note. Folders answer "where does
 * this live"; a category answers "what is this about", which is a question with more than one right
 * answer — which is exactly why it could not be a second folder tree.
 */
export const categorySchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  name: z.string().min(1).max(60),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Category = z.infer<typeof categorySchema>;

export const categoryCreateSchema = z.object({
  name: categorySchema.shape.name,
});

export type CategoryCreate = z.input<typeof categoryCreateSchema>;

/**
 * How a category got onto a note. `user` is a stated fact and nothing may overwrite it; `auto` is
 * echo's reading of the note, which is why it can be taken off and why taking it off teaches.
 */
export const categorySourceSchema = z.enum(["user", "auto"]);

export type CategorySource = z.infer<typeof categorySourceSchema>;

export const noteCategorySchema = z.object({
  noteId: z.uuid(),
  categoryId: z.uuid(),
  source: categorySourceSchema,
  createdAt: z.date(),
});

export type NoteCategory = z.infer<typeof noteCategorySchema>;
