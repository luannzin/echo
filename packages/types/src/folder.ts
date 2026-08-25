import { z } from "zod";

export const folderSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  parentId: z.uuid().nullable(),
  name: z.string().min(1).max(200),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Folder = z.infer<typeof folderSchema>;

export const folderCreateSchema = z.object({
  name: folderSchema.shape.name,
  parentId: z.uuid().nullable().default(null),
});

export type FolderCreate = z.input<typeof folderCreateSchema>;
