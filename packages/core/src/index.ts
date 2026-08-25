import { type Clock, type IdFactory, systemClock, uuid } from "./clock";
import { createEventBus, type EventBus } from "./events";
import { createFolderService, type FolderService } from "./folders";
import { createNoteService, type NoteService } from "./notes";
import type { Repositories } from "./ports";

export * from "./clock";
export * from "./events";
export * from "./folders";
export * from "./notes";
export * from "./ports";
export * from "./title";

export type Echo = {
  notes: NoteService;
  folders: FolderService;
  events: EventBus;
};

/** Composition root for the domain: repositories in, services out. */
export function createEcho({
  repositories,
  events = createEventBus(),
  now = systemClock,
  newId = uuid,
}: {
  repositories: Repositories;
  events?: EventBus;
  now?: Clock;
  newId?: IdFactory;
}): Echo {
  return {
    notes: createNoteService({ repository: repositories.notes, events, now, newId }),
    folders: createFolderService({ repository: repositories.folders, events, now, newId }),
    events,
  };
}
