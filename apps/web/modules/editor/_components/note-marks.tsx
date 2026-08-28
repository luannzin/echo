"use client";

import { parse } from "@echo/parser";
import type { Task } from "@echo/types";
import { CalendarClock, CircleCheck, CircleDashed } from "lucide-react";
import { type ReactNode, useDeferredValue, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { copy } from "@/shared/lib/i18n";
import { numeric } from "@/shared/lib/styles";
import { formatDue } from "@/shared/lib/time";

/**
 * What a note is doing, beside what it says: the task it produced, and when that is due.
 *
 * Two kinds of answer, drawn differently on purpose. A solid badge is something echo was *told* —
 * a task that exists, a date that was filed. A dashed one is only a reading of the words on screen,
 * and nothing was stored on the strength of it. Reading is deferred, so a five-thousand-character
 * note is parsed between keystrokes rather than on each one.
 */
export const NoteMarks = ({
  task,
  text,
  fallback = null,
}: {
  task: Task | undefined;
  text: string;
  /** Drawn instead when there is nothing to mark — and only where the caller has nothing either. */
  fallback?: ReactNode;
}) => {
  const words = copy().editor;
  const deferred = useDeferredValue(text);
  const read = useMemo(() => parse(deferred), [deferred]);

  const due = task?.dueAt ?? read.deadline?.date ?? null;
  /** Stored beats read: once a task exists, it is what the note *is*, not what it looks like. */
  const stated = task !== undefined;
  const detected = read.tasks[0];

  if (!stated && !detected && due === null) return fallback;

  return (
    <>
      {stated || detected ? (
        <Badge
          variant={stated ? "secondary" : "outline"}
          title={
            stated
              ? task?.completedAt
                ? words.doneWithTask(task.title)
                : words.taskOnThisNote(task?.title ?? "")
              : words.readsAsSomethingToDo(detected?.text ?? "")
          }
          className={`max-w-56 gap-1 font-normal ${stated ? "" : "border-dashed text-muted-foreground"}`}
        >
          {task?.completedAt ? (
            <CircleCheck aria-hidden="true" className="size-3" />
          ) : (
            <CircleDashed aria-hidden="true" className="size-3" />
          )}
          <span className="truncate">{stated ? words.task : words.readsAsATask}</span>
        </Badge>
      ) : null}

      {due ? (
        <Badge
          variant={task?.dueAt ? "secondary" : "outline"}
          title={
            task?.dueAt ? words.whenThisIsDue : words.readADateInTheNote(read.deadline?.text ?? "")
          }
          className={`gap-1 font-normal ${numeric} ${
            task?.dueAt ? "" : "border-dashed text-muted-foreground"
          }`}
        >
          <CalendarClock aria-hidden="true" className="size-3" />
          {formatDue(due)}
        </Badge>
      ) : null}
    </>
  );
};
