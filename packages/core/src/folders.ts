import {
  DEFAULT_WORKSPACE_ID,
  type Folder,
  type FolderCreate,
  folderCreateSchema,
  folderSchema,
} from "@echo/types";
import type { Clock, IdFactory } from "./clock";
import type { EventBus } from "./events";
import type { FolderRepository } from "./ports";

export type FolderService = ReturnType<typeof createFolderService>;

export function createFolderService({
  repository,
  events,
  now,
  newId,
}: {
  repository: FolderRepository;
  events: EventBus;
  now: Clock;
  newId: IdFactory;
}) {
  return {
    async create(input: FolderCreate): Promise<Folder> {
      const { name, parentId } = folderCreateSchema.parse(input);
      const timestamp = now();
      const folder = await repository.insert({
        id: newId(),
        workspaceId: DEFAULT_WORKSPACE_ID,
        parentId,
        name,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      events.emit({ type: "folder.created", folder });
      return folder;
    },

    async rename(id: string, name: string): Promise<Folder> {
      const folder = await repository.update(id, {
        name: folderSchema.shape.name.parse(name),
        updatedAt: now(),
      });
      events.emit({ type: "folder.renamed", folder });
      return folder;
    },

    async move(id: string, parentId: string | null): Promise<Folder> {
      const previous = await repository.get(id);
      if (!previous) throw new Error(`Folder ${id} not found`);
      if (parentId !== null && (await isDescendant(repository, parentId, id))) {
        throw new Error("A folder cannot be moved inside itself");
      }
      const folder = await repository.update(id, { parentId, updatedAt: now() });
      events.emit({ type: "folder.moved", folder, previousParentId: previous.parentId });
      return folder;
    },

    async delete(id: string): Promise<void> {
      await repository.delete(id);
      events.emit({ type: "folder.deleted", folderId: id });
    },

    get(id: string): Promise<Folder | null> {
      return repository.get(id);
    },

    list(): Promise<Folder[]> {
      return repository.list();
    },
  };
}

/** Guards the tree against cycles: is `candidate` inside the subtree rooted at `ancestorId`? */
async function isDescendant(
  repository: FolderRepository,
  candidate: string,
  ancestorId: string,
): Promise<boolean> {
  let current: string | null = candidate;
  while (current) {
    if (current === ancestorId) return true;
    const folder: Folder | null = await repository.get(current);
    current = folder?.parentId ?? null;
  }
  return false;
}
