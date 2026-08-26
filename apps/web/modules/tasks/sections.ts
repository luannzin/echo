import type { Task } from "@echo/types";
import { dueBucket } from "@/shared/lib/time";

export const SECTIONS = ["overdue", "due", "someday", "done"] as const;

export type Section = (typeof SECTIONS)[number];

export const SECTION_HEADING: Record<Section, string> = {
  overdue: "Late",
  due: "Due",
  someday: "No date",
  done: "Done",
};

const dueTime = (task: Task): number => task.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;

/**
 * The database hands tasks over in due order; one created or changed since then sits wherever the
 * optimistic update left it. Sorting here is what keeps the order true without re-reading the list
 * every time something is ticked.
 */
export const groupTasks = (tasks: Task[]): Map<Section, Task[]> => {
  const ordered = [...tasks].sort(
    (a, b) => dueTime(a) - dueTime(b) || a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const sections = new Map<Section, Task[]>();
  for (const task of ordered) {
    const section: Section = task.completedAt ? "done" : dueBucket(task.dueAt);
    const existing = sections.get(section);
    if (existing) existing.push(task);
    else sections.set(section, [task]);
  }
  return sections;
};
