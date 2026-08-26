"use client";

import { folderPath } from "@echo/core";
import { CONFIDENT, type LearnedRule } from "@echo/learning";
import type { Folder } from "@echo/types";
import { Undo2 } from "lucide-react";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * What echo has worked out about the way this reader writes — in the reader's own words, and never
 * as a score. Everything here is undoable, because a system that learns without an undo is a system
 * that is slowly deciding things on your behalf.
 */
export function Learned({
  rules,
  folders,
  onForget,
}: {
  rules: LearnedRule[];
  /** So a rule about a place can name the place rather than the row it lives in. */
  folders: Folder[];
  onForget: (rule: LearnedRule) => void;
}) {
  // A single correction is a coincidence. Nothing is claimed as learned until it repeats.
  const settled = rules.filter(
    (rule) => rule.confidence >= CONFIDENT && rule.kind !== "note" && rule.kind !== "duplicate",
  );

  if (settled.length === 0) {
    return (
      <p className="text-xs leading-5">
        Correct what echo notices — a task that is not a task, a date that is not a deadline — and
        what it learns from that shows up here.
      </p>
    );
  }

  return (
    <TooltipProvider>
      <ul className="space-y-1">
        {settled.map((rule) => (
          <li key={rule.key} className="group flex items-center gap-2 rounded-md px-2 py-1.5">
            <span className="min-w-0 flex-1 text-xs leading-5">
              <span className="text-foreground">{subjectOf(rule, folders)}</span> {phrasing(rule)}
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => onForget(rule)}
                    aria-label={`Forget what echo learned about ${subjectOf(rule, folders)}`}
                    className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity duration-150 pointer-coarse:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 hover:text-foreground"
                  />
                }
              >
                <Undo2 aria-hidden="true" className="size-3.5" />
              </TooltipTrigger>
              <TooltipPopup side="left">Forget this</TooltipPopup>
            </Tooltip>
          </li>
        ))}
      </ul>
    </TooltipProvider>
  );
}

/** A phrase is quoted because the reader wrote it; a folder is named because they made it. */
function subjectOf(rule: LearnedRule, folders: Folder[]): string {
  return rule.kind === "destination"
    ? folderPath(folders, rule.subject)
    : `\u201C${rule.subject}\u201D`;
}

function phrasing(rule: LearnedRule): string {
  if (rule.kind === "destination") {
    return rule.outcome === "accept"
      ? "is where notes like that go"
      : "is not where notes like that go";
  }
  const subject = rule.kind === "task-phrase" ? "something to do" : "a deadline";
  return rule.outcome === "accept"
    ? `usually means ${subject}`
    : `usually does not mean ${subject}`;
}
