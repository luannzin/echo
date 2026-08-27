import { DEFAULT_WORKSPACE_ID, type Task, type TaskCreate, taskCreateSchema } from "@echo/types";
import type { Clock, IdFactory } from "./clock";
import type { EventBus } from "./events";
import type { TaskRepository } from "./ports";

export type TaskService = ReturnType<typeof createTaskService>;

/**
 * Tasks exist because a reader said so. Nothing here reads a note and decides on its own — the
 * parser proposes, the reader agrees, and only then is there a task. That is the same rule the rest
 * of echo follows: an explicit choice outranks anything inferred.
 */
export const createTaskService = ({
  repository,
  events,
  now,
  newId,
}: {
  repository: TaskRepository;
  events: EventBus;
  now: Clock;
  newId: IdFactory;
}) => {
  return {
    async create(input: TaskCreate): Promise<Task> {
      const { noteId, title, dueAt } = taskCreateSchema.parse(input);
      const timestamp = now();
      const task = await repository.insert({
        id: newId(),
        workspaceId: DEFAULT_WORKSPACE_ID,
        noteId,
        title,
        dueAt,
        completedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      events.emit({ type: "task.created", task });
      return task;
    },

    /** Completion is a timestamp rather than a flag, so "done when?" is answerable later. */
    async setCompleted(id: string, completed: boolean): Promise<Task> {
      const timestamp = now();
      const task = await repository.update(id, {
        completedAt: completed ? timestamp : null,
        updatedAt: timestamp,
      });
      events.emit({ type: "task.updated", task });
      return task;
    },

    /** When it is due, said outright rather than read out of the words. Null takes the date off. */
    async setDue(id: string, dueAt: Date | null): Promise<Task> {
      const task = await repository.update(id, { dueAt, updatedAt: now() });
      events.emit({ type: "task.updated", task });
      return task;
    },

    async delete(id: string): Promise<void> {
      await repository.delete(id);
      events.emit({ type: "task.deleted", taskId: id });
    },

    list(): Promise<Task[]> {
      return repository.list();
    },
  };
};
