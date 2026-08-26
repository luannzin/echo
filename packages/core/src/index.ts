import { type CategoryService, createCategoryService } from "./categories";
import { type Clock, type IdFactory, systemClock, uuid } from "./clock";
import { createEventBus, type EventBus } from "./events";
import { createFolderService, type FolderService } from "./folders";
import { createLearningService, type LearningService } from "./learning";
import { createNoteService, type NoteService } from "./notes";
import { createObservationService, type ObservationService } from "./observations";
import type { Repositories } from "./ports";
import { createTaskService, type TaskService } from "./tasks";
import { createTemporalService, type TemporalService } from "./temporal-service";

export * from "./analyzer";
export * from "./categories";
export * from "./changes";
export * from "./clock";
export * from "./co-open";
export * from "./events";
export * from "./folders";
export * from "./learning";
export * from "./notes";
export * from "./observations";
export * from "./ports";
export * from "./query";
export * from "./tasks";
export * from "./temporal";
export * from "./temporal-service";
export * from "./timeline";
export * from "./title";
export * from "./tree";

export type Echo = {
  notes: NoteService;
  folders: FolderService;
  categories: CategoryService;
  tasks: TaskService;
  learning: LearningService;
  /** What the notes say about time. */
  temporal: TemporalService;
  /** Where the reader has been, which is what "since you last looked" is measured against. */
  observations: ObservationService;
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
    categories: createCategoryService({ repository: repositories.categories, events, now, newId }),
    tasks: createTaskService({ repository: repositories.tasks, events, now, newId }),
    learning: createLearningService({ repository: repositories.learning, events, now, newId }),
    temporal: createTemporalService({ repository: repositories.temporal, now }),
    observations: createObservationService({
      repository: repositories.observations,
      now,
      newId,
    }),
    events,
  };
};
