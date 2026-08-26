import type { Folder } from "@echo/types";
import { FolderPlus, type LucideIcon, Pencil, Trash2 } from "lucide-react";

/**
 * What is being dragged. The drop target has to know before the drop happens — `dataTransfer` only
 * hands its contents over on drop, and a row must light up on the way past.
 */
export type Dragged = { kind: "note" | "folder"; id: string };

/** A row that has turned into a text field: a new folder being named, or an old one renamed. */
export type Draft =
  | { mode: "create"; parentId: string | null }
  | { mode: "rename"; folder: Folder };

export type FolderAction = {
  label: string;
  icon: LucideIcon;
  run: () => void;
  destructive?: boolean;
};

/**
 * The three things a folder can be told to do, offered from its own menu and from a right-click. One
 * list, because they mean the same thing wherever they are read.
 */
export const folderActions = (
  folder: Folder,
  onDraft: (draft: Draft) => void,
  onDelete: () => void,
): FolderAction[] => [
  {
    label: "New folder inside",
    icon: FolderPlus,
    run: () => onDraft({ mode: "create", parentId: folder.id }),
  },
  { label: "Rename", icon: Pencil, run: () => onDraft({ mode: "rename", folder }) },
  { label: "Delete folder", icon: Trash2, run: onDelete, destructive: true },
];
