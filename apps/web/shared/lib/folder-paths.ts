import { folderPath } from "@echo/core";
import type { Folder } from "@echo/types";

/** Every folder named by its full path and ordered by it. */
export type FolderPath = { id: string; label: string };

export const folderPaths = (folders: Folder[]): FolderPath[] =>
  folders
    .map((folder) => ({ id: folder.id, label: folderPath(folders, folder.id) }))
    .sort((a, b) => a.label.localeCompare(b.label));
