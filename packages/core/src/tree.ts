import type { Folder } from "@echo/types";

/**
 * The folder tree, as a shape something can render. Pure and synchronous: the folder list is small
 * enough to hold, and an explorer that had to ask the database for each level would expand a folder
 * a frame late.
 */
export type FolderNode = {
  folder: Folder;
  depth: number;
  children: FolderNode[];
};

/**
 * Nests a flat folder list. Ordering is by name at every level, so the tree looks the same on every
 * machine. A folder whose parent is missing — a row that outlived its parent, or a partial sync —
 * is shown at the root rather than dropped: an invisible folder is worse than a misplaced one.
 */
export function buildTree(folders: Folder[]): FolderNode[] {
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
}

/** Every row of the tree in the order it is drawn, with collapsed folders' children left out. */
export function flattenTree(nodes: FolderNode[], expanded: ReadonlySet<string>): FolderNode[] {
  return nodes.flatMap((node) =>
    expanded.has(node.folder.id) ? [node, ...flattenTree(node.children, expanded)] : [node],
  );
}

/**
 * A folder's place, written the way a reader would say it: `Work / Authentication`. Used wherever a
 * destination has to be named out of context — a suggestion, a search result, a command.
 */
export function folderPath(folders: Folder[], folderId: string | null): string {
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
}

/** The folder and everything under it — what a move may not be dropped into. */
export function subtreeIds(folders: Folder[], folderId: string): Set<string> {
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
}
