import type { Folder, LearningEvent, Note, Task } from "@echo/types";

export type DomainEvent =
  | { type: "note.created"; note: Note }
  | { type: "note.updated"; note: Note; previous: Note }
  | { type: "note.moved"; note: Note; previousFolderId: string | null }
  | { type: "note.deleted"; noteId: string }
  | { type: "folder.created"; folder: Folder }
  | { type: "folder.renamed"; folder: Folder }
  | { type: "folder.moved"; folder: Folder; previousParentId: string | null }
  | { type: "folder.deleted"; folderId: string }
  | { type: "task.created"; task: Task }
  | { type: "task.updated"; task: Task }
  | { type: "task.deleted"; taskId: string }
  | { type: "learning.recorded"; event: LearningEvent }
  | { type: "learning.forgotten"; kind: LearningEvent["kind"]; subject: string };

export type EventListener = (event: DomainEvent) => void;

export type EventBus = {
  emit: (event: DomainEvent) => void;
  subscribe: (listener: EventListener) => () => void;
};

export const createEventBus = (): EventBus => {
  const listeners = new Set<EventListener>();
  return {
    emit(event) {
      for (const listener of listeners) listener(event);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
