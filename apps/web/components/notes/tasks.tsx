"use client";

import type { Note, Task } from "@echo/types";
import { ArrowUpRight, SquareCheck, Trash2 } from "lucide-react";
import { Label } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { dueBucket, formatDue } from "@/lib/time";

const HEADINGS = {
  overdue: "Late",
  due: "Due",
  someday: "No date",
  done: "Done",
} as const;

type Section = keyof typeof HEADINGS;

/**
 * Everything the reader has agreed to do, and the note each one came out of. There is no way to add
 * a task here on purpose: a task is something a note already said, so it is created where the note
 * is written and lives here afterwards. Opening its source is always one click away, because the
 * sentence around a task is usually the part that matters.
 */
export function Tasks({
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
}) {
  if (tasks.length === 0) {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-3 px-6 pb-20 text-center">
        <SquareCheck aria-hidden="true" className="size-5 text-muted-foreground" />
        <p className="font-display text-2xl">Nothing to do yet.</p>
        <p className="max-w-sm text-muted-foreground text-sm leading-relaxed">
          When you write something that reads like a task, echo offers it as one. Agree, and it
          appears here with whatever date the note gave it.
        </p>
      </div>
    );
  }

  // The database hands them over in due order; a task created or changed since then is sitting
  // wherever the optimistic update left it. Sorting the list here is what keeps the order true
  // without asking for the whole list again every time something is ticked.
  const ordered = [...tasks].sort(
    (a, b) =>
      (a.dueAt?.getTime() ?? Number.POSITIVE_INFINITY) -
        (b.dueAt?.getTime() ?? Number.POSITIVE_INFINITY) ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const sections = new Map<Section, Task[]>();
  for (const task of ordered) {
    const section: Section = task.completedAt ? "done" : dueBucket(task.dueAt);
    const existing = sections.get(section);
    if (existing) existing.push(task);
    else sections.set(section, [task]);
  }

  const open = tasks.filter((task) => task.completedAt === null).length;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-6">
      <div className="flex items-baseline justify-between gap-4 pb-6">
        <h1 className="font-display text-3xl tracking-tight">Tasks</h1>
        <Label>
          {open} open of {tasks.length}
        </Label>
      </div>

      {(["overdue", "due", "someday", "done"] as const).map((section) => {
        const group = sections.get(section);
        if (!group || group.length === 0) return null;

        return (
          <section key={section} className="pb-6">
            <h2 className="pb-2">
              <Label>{HEADINGS[section]}</Label>
            </h2>
            <ul>
              {group.map((task, index) => (
                <li
                  key={task.id}
                  className="animate-rise"
                  style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
                >
                  <Row
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
}

function Row({
  task,
  note,
  late,
  onToggle,
  onDelete,
  onOpenNote,
}: {
  task: Task;
  note: Note | undefined;
  late: boolean;
  onToggle: (task: Task, completed: boolean) => void;
  onDelete: (task: Task) => void;
  onOpenNote: (noteId: string, from: HTMLElement) => void;
}) {
  const done = task.completedAt !== null;

  return (
    <div className="group flex items-start gap-3 rounded-md py-2 pe-1 ps-1 transition-colors duration-150 hover:bg-card">
      <Checkbox
        checked={done}
        onCheckedChange={(checked) => onToggle(task, checked === true)}
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className="mt-0.5 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          // Completion is a strike-through that fades rather than a row that vanishes: a task you
          // just ticked should stay where your eye is, long enough to see that it happened.
          className={`text-sm leading-6 transition-[color,opacity] duration-200 ${
            done ? "text-muted-foreground line-through opacity-70" : "text-foreground"
          }`}
        >
          {task.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {task.dueAt ? (
            <span className={late && !done ? "text-warning" : "text-muted-foreground"}>
              {formatDue(task.dueAt)}
            </span>
          ) : null}
          {note ? (
            <button
              type="button"
              data-note-id={note.id}
              onClick={(event) => onOpenNote(note.id, event.currentTarget)}
              className="inline-flex max-w-full items-center gap-1 truncate rounded text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate">{note.title || "Untitled"}</span>
              <ArrowUpRight aria-hidden="true" className="size-3 shrink-0" />
            </button>
          ) : null}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${task.title}`}
        onClick={() => onDelete(task)}
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}
