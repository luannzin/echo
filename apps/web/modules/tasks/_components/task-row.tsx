"use client";

import type { Note, Task } from "@echo/types";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { quiet } from "@/shared/lib/styles";
import { formatDue } from "@/shared/lib/time";

export const TaskRow = ({
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
}) => {
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
        {/* A strike-through that fades rather than a row that vanishes: a task you just ticked
            should stay where your eye is, long enough to see that it happened. */}
        <span
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
        className={`shrink-0 text-muted-foreground ${quiet}`}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
};
