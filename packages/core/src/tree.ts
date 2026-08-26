import type { Folder } from "@echo/types";

/** The tree as a shape something can render. Synchronous, because an explorer that asked the
 *  database for each level would expand a folder a frame late. */
export type FolderNode = {
  folder: Folder;
  depth: number;
  children: FolderNode[];
};

/**
 * Nests a flat folder list, ordered by name at every level. A folder whose parent is missing is
 * shown at the root rather than dropped: an invisible folder is worse than a misplaced one.
 */
export const buildTree = (folders: Folder[]): FolderNode[] => {
  const byParent = new Map<string | null, Folder[]>();
  const known = new Set(folders.map((folder) => folder.id));

  for (const folder of folders) {
    const parentId =
      folder.parentId !== null && known.has(folder.parentId) ? folder.parentId : null;
    const siblings = byParent.get(parentId);
    if (siblings) siblings.push(folder);
    else byParent.set(parentId, [folder]);
  }

  const build = (parentId: string | null, depth: number): FolderNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
      .map((folder) => ({ folder, depth, children: build(folder.id, depth + 1) }));

  return build(null, 0);
};

/** Every row of the tree in the order it is drawn, with collapsed folders' children left out. */
export const flattenTree = (nodes: FolderNode[], expanded: ReadonlySet<string>): FolderNode[] => {
  return nodes.flatMap((node) =>
    expanded.has(node.folder.id) ? [node, ...flattenTree(node.children, expanded)] : [node],
  );
};

/** A folder's place, written the way a reader would say it: `Work / Authentication`. */
export const folderPath = (folders: Folder[], folderId: string | null): string => {
  if (folderId === null) return "Inbox";
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const names: string[] = [];

  let current = byId.get(folderId);
  // Bounded by the folder count, so a parent cycle that survived the move guard cannot hang a
  // render — it draws a truncated path instead.
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    names.unshift(current.name);
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }

  return names.join(" / ");
};

/** The folder and everything under it — what a move may not be dropped into. */
export const subtreeIds = (folders: Folder[], folderId: string): Set<string> => {
  const children = new Map<string, string[]>();
  for (const folder of folders) {
    if (folder.parentId === null) continue;
    const siblings = children.get(folder.parentId);
    if (siblings) siblings.push(folder.id);
    else children.set(folder.parentId, [folder.id]);
  }

  const inside = new Set<string>();
  const walk = (id: string) => {
    if (inside.has(id)) return;
    inside.add(id);
    for (const child of children.get(id) ?? []) walk(child);
  };
  walk(folderId);

  return inside;
};
