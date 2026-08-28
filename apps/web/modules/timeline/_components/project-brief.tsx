"use client";

import type { ProjectBrief } from "@echo/core";
import { SquareCheck } from "lucide-react";
import { Label } from "@/shared/_components/label";
import { copy } from "@/shared/lib/i18n";
import { formatDay, formatDue } from "@/shared/lib/time";

/**
 * What this project is, as echo reads it.
 *
 * Nobody wrote this and nobody maintains it. There is no project description to keep current and no
 * summary that goes stale the week after someone types it — it is derived from the notes every time
 * it is read, so it is either right or the notes are.
 */
export const ProjectBriefBlock = ({
  brief,
  scope,
  onOpenNote,
  onOpenTasks,
}: {
  brief: ProjectBrief;
  /** The project's name, so the brief is about their project and not about "here". */
  scope: string;
  onOpenNote: (noteId: string, from: HTMLElement) => void;
  onOpenTasks: () => void;
}) => (
  <section className="mb-6 rounded-lg border border-border bg-card/40 px-4 py-3.5">
    {/* One sentence, built in the dictionary: the count, the project and the two dates sit in a
        different order in every language, and this is the shape that lets them move. */}
    <p className="text-sm leading-relaxed">
      {copy().timeline.written(brief.count, scope, formatDay(brief.from), formatDay(brief.to))}
    </p>

    <div className="pt-3">
      <Label>{copy().timeline.recently}</Label>
      <ul className="pt-1">
        {brief.recent.map((note) => (
          <li key={note.id}>
            <button
              type="button"
              onClick={(event) => onOpenNote(note.id, event.currentTarget)}
              className="-mx-2 flex w-[calc(100%+1rem)] items-center rounded-md px-2 py-1 text-start text-sm outline-none transition-[background-color,transform] duration-150 ease-[var(--ease-out-quart)] hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
            >
              <span className="truncate">{note.title || copy().common.untitled}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>

    {brief.themes.length > 0 ? (
      <div className="pt-3">
        <Label>{copy().timeline.recurringThemes}</Label>
        <p className="pt-1 text-muted-foreground text-sm">{brief.themes.join(" · ")}</p>
      </div>
    ) : null}

    {/* Only what is still open. A project's brief is about what is left, not what was finished. */}
    {brief.open.length > 0 ? (
      <div className="pt-3">
        <Label>{copy().timeline.openItems}</Label>
        <ul className="pt-1">
          {brief.open.map((task) => (
            <li key={task.id} className="flex items-baseline gap-2 py-0.5 text-sm">
              <SquareCheck aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{task.title}</span>
              {task.dueAt ? (
                <span className="shrink-0 text-muted-foreground text-xs">
                  {formatDue(task.dueAt)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onOpenTasks}
          className="-mx-1 mt-1 rounded-md px-1 py-0.5 text-muted-foreground text-xs outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copy().timeline.allTasks}
        </button>
      </div>
    ) : null}
  </section>
);
