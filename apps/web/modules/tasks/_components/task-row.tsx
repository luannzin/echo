"use client";

import { folderPath } from "@echo/core";
import type { Folder, Note, Task } from "@echo/types";
import { ArrowUpRight, Folder as FolderIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { numeric, quiet } from "@/shared/lib/styles";
import { formatDue, formatExact, formatStamp } from "@/shared/lib/time";

export const TaskRow = ({
  task,
  note,
  folders,
  late,
  onToggle,
  onDelete,
  onOpenNote,
}: {
  task: Task;
  note: Note | undefined;
  folders: Folder[];
  late: boolean;
  onToggle: (task: Task, completed: boolean) => void;
  onDelete: (task: Task) => void;
  onOpenNote: (noteId: string, from: HTMLElement) => void;
}) => {
  const done = task.completedAt !== null;
  const where = note?.folderId ? folderPath(folders, note.folderId) : null;

  return (
    // The whole row ticks the box. The checkbox is still the only control a keyboard or a screen
    // reader ever sees — this is a hit area, not a second way in — so anything that is already a
    // control keeps its own click.
    // biome-ignore lint/a11y/noStaticElementInteractions: the row is a hit area, not a control.
    // biome-ignore lint/a11y/useKeyWithClickEvents: the checkbox inside is the keyboard control.
    <div
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button,a")) return;
        onToggle(task, !done);
      }}
      className="group flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-card has-focus-visible:bg-card"
    >
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
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-muted-foreground text-xs">
          {/* Done outranks due: once it is finished, when it was due stops being the news. */}
          {done && task.completedAt ? (
            <span className={numeric}>Done {formatStamp(task.completedAt)}</span>
          ) : task.dueAt ? (
            <span
              title={formatExact(task.dueAt)}
              className={`${numeric} ${late ? "text-warning" : ""}`}
            >
              {formatDue(task.dueAt)}
            </span>
          ) : null}
          {note ? (
            <button
              type="button"
              data-note-id={note.id}
              onClick={(event) => onOpenNote(note.id, event.currentTarget)}
              className="inline-flex max-w-full items-center gap-1 truncate rounded outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate">{note.title || "Untitled"}</span>
              <ArrowUpRight aria-hidden="true" className="size-3 shrink-0" />
            </button>
          ) : null}
          {where ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <FolderIcon aria-hidden="true" className="size-3 shrink-0" />
              <span className="truncate">{where}</span>
            </span>
          ) : null}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${task.title}`}
        onClick={() => onDelete(task)}
        className={`shrink-0 text-muted-foreground hover:text-destructive ${quiet}`}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
};
