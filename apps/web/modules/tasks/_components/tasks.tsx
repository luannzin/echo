"use client";

import type { Folder, Note, Task } from "@echo/types";
import { ChevronRight, SquareCheck } from "lucide-react";
import { TaskRow } from "@/modules/tasks/_components/task-row";
import { groupTasks, SECTION_HEADING, SECTIONS } from "@/modules/tasks/sections";
import { EmptyState } from "@/shared/_components/empty-state";
import { Label } from "@/shared/_components/label";
import { stagger } from "@/shared/lib/stagger";

/** Beyond this many finished tasks, Done folds: the point of the screen is what is still open. */
const FOLD_DONE_OVER = 4;

/**
 * Everything the notes said there was to do, and the note each one came out of. There is no way to
 * add a task here on purpose: a task is something a note already said, so it is created where the
 * note is written and lives here afterwards.
 */
export const Tasks = ({
  tasks,
  noteOf,
  folders,
  onToggle,
  onDelete,
  onOpenNote,
}: {
  tasks: Task[];
  noteOf: (noteId: string) => Note | undefined;
  folders: Folder[];
  onToggle: (task: Task, completed: boolean) => void;
  onDelete: (task: Task) => void;
  onOpenNote: (noteId: string, from: HTMLElement) => void;
}) => {
  if (tasks.length === 0) {
    return (
      <EmptyState icon={SquareCheck} title="Nothing to do yet.">
        Write something that reads like a task and it lands here, with whatever date the note gave
        it. Say the word on the chip and echo drops it.
      </EmptyState>
    );
  }

  const sections = groupTasks(tasks);
  const open = tasks.filter((task) => task.completedAt === null).length;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-6">
      <div className="flex items-baseline justify-between gap-4 pb-6">
        <h1 className="font-display text-3xl tracking-tight">Tasks</h1>
        <Label>
          {open} open of {tasks.length}
        </Label>
      </div>

      {SECTIONS.map((section) => {
        const group = sections.get(section);
        if (!group || group.length === 0) return null;

        const rows = (
          <ul>
            {group.map((task, index) => (
              <li key={task.id} className="animate-rise" style={stagger(index)}>
                <TaskRow
                  task={task}
                  note={noteOf(task.noteId)}
                  folders={folders}
                  late={section === "overdue"}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onOpenNote={onOpenNote}
                />
              </li>
            ))}
          </ul>
        );

        // Finished work folds away once there is enough of it to bury what is still open — and it
        // is a `<details>`, so the disclosure, the keyboard and the state are the browser's.
        if (section === "done" && group.length > FOLD_DONE_OVER) {
          return (
            <details key={section} className="group/fold pb-6">
              <summary className="flex cursor-pointer list-none items-center gap-2 pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ChevronRight
                  aria-hidden="true"
                  className="size-3 text-muted-foreground transition-transform duration-150 ease-[var(--ease-out-quart)] group-open/fold:rotate-90"
                />
                <Label>
                  {SECTION_HEADING[section]} · {group.length}
                </Label>
              </summary>
              {rows}
            </details>
          );
        }

        return (
          <section key={section} className="pb-6">
            <h2 className="pb-2">
              <Label>{SECTION_HEADING[section]}</Label>
            </h2>
            {rows}
          </section>
        );
      })}
    </div>
  );
};
