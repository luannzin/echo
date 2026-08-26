"use client";

import type { Note, Task } from "@echo/types";
import { SquareCheck } from "lucide-react";
import { TaskRow } from "@/modules/tasks/_components/task-row";
import { groupTasks, SECTION_HEADING, SECTIONS } from "@/modules/tasks/sections";
import { EmptyState } from "@/shared/_components/empty-state";
import { Label } from "@/shared/_components/label";
import { stagger } from "@/shared/lib/stagger";

/**
 * Everything the reader has agreed to do, and the note each one came out of. There is no way to add
 * a task here on purpose: a task is something a note already said, so it is created where the note
 * is written and lives here afterwards.
 */
export const Tasks = ({
  tasks,
  noteOf,
  onToggle,
  onDelete,
  onOpenNote,
}: {
  tasks: Task[];
  noteOf: (noteId: string) => Note | undefined;
  onToggle: (task: Task, completed: boolean) => void;
  onDelete: (task: Task) => void;
  onOpenNote: (noteId: string, from: HTMLElement) => void;
}) => {
  if (tasks.length === 0) {
    return (
      <EmptyState icon={SquareCheck} title="Nothing to do yet.">
        When you write something that reads like a task, echo offers it as one. Agree, and it
        appears here with whatever date the note gave it.
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

        return (
          <section key={section} className="pb-6">
            <h2 className="pb-2">
              <Label>{SECTION_HEADING[section]}</Label>
            </h2>
            <ul>
              {group.map((task, index) => (
                <li key={task.id} className="animate-rise" style={stagger(index)}>
                  <TaskRow
                    task={task}
                    note={noteOf(task.noteId)}
                    late={section === "overdue"}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onOpenNote={onOpenNote}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
