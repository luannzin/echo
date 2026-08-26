import { type Clock, type IdFactory, systemClock, uuid } from "./clock";
import { createEventBus, type EventBus } from "./events";
import { createFolderService, type FolderService } from "./folders";
import { createLearningService, type LearningService } from "./learning";
import { createNoteService, type NoteService } from "./notes";
import type { Repositories } from "./ports";
import { createTaskService, type TaskService } from "./tasks";

export * from "./analyzer";
export * from "./clock";
export * from "./events";
export * from "./folders";
export * from "./learning";
export * from "./notes";
export * from "./ports";
export * from "./tasks";
export * from "./title";
export * from "./tree";

export type Echo = {
  notes: NoteService;
  folders: FolderService;
  tasks: TaskService;
  learning: LearningService;
  events: EventBus;
};

/** Composition root for the domain: repositories in, services out. */
export const createEcho = ({
  repositories,
  events = createEventBus(),
  now = systemClock,
  newId = uuid,
}: {
  repositories: Repositories;
  events?: EventBus;
  now?: Clock;
  newId?: IdFactory;
}): Echo => {
  return {
    notes: createNoteService({ repository: repositories.notes, events, now, newId }),
    folders: createFolderService({ repository: repositories.folders, events, now, newId }),
    tasks: createTaskService({ repository: repositories.tasks, events, now, newId }),
    learning: createLearningService({ repository: repositories.learning, events, now, newId }),
    events,
  };
};
