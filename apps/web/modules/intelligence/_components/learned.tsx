"use client";

import { folderPath } from "@echo/core";
import { CONFIDENT, type LearnedRule } from "@echo/learning";
import type { Folder } from "@echo/types";
import { Undo2 } from "lucide-react";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { quiet } from "@/shared/lib/styles";

/** A phrase is quoted because the reader wrote it; a folder is named because they made it. */
const subjectOf = (rule: LearnedRule, folders: Folder[]): string => {
  if (rule.kind === "destination") return folderPath(folders, rule.subject);
  // An alias is a pair, filed under both words at once.
  if (rule.kind === "alias") {
    const [first = "", second = ""] = rule.subject.split("|");
    return `“${first}” and “${second}”`;
  }
  // A concept rule is about one note, and the note is not what the reader is being told about.
  if (rule.kind === "concept") return `“${rule.subject.split(":").slice(1).join(":")}”`;
  return `“${rule.subject}”`;
};

const phrasing = (rule: LearnedRule): string => {
  if (rule.kind === "destination") {
    return rule.outcome === "accept"
      ? "is where notes like that go"
      : "is not where notes like that go";
  }
  if (rule.kind === "alias") {
    return rule.outcome === "accept" ? "mean the same thing" : "are not the same thing";
  }
  if (rule.kind === "concept") {
    return rule.outcome === "accept"
      ? "is what that note is about"
      : "is not what that note is about";
  }
  const meaning = rule.kind === "task-phrase" ? "something to do" : "a deadline";
  return rule.outcome === "accept"
    ? `usually means ${meaning}`
    : `usually does not mean ${meaning}`;
};

/**
 * What echo has worked out about the way this reader writes — in their own words, never as a score.
 * Everything here is undoable, because a system that learns without an undo is one that is slowly
 * deciding things on your behalf.
 */
export const Learned = ({
  rules,
  folders,
  onForget,
}: {
  rules: LearnedRule[];
  /** So a rule about a place can name the place rather than the row it lives in. */
  folders: Folder[];
  onForget: (rule: LearnedRule) => void;
}) => {
  /**
   * A single correction is a coincidence, and nothing *inferred* is claimed as learned until it
   * repeats. Aliases and concepts are the exception, and not by relaxing the rule: they are not
   * inferred from a correction, they *are* the correction — the reader pressed × on a claim echo
   * put in front of them, which is a statement rather than a pattern. Search obeys it at once, so
   * it has to be visible and undoable at once too, or a refusal is a change nobody can take back.
   */
  const stated = (rule: LearnedRule) => rule.kind === "alias" || rule.kind === "concept";
  const settled = rules.filter(
    (rule) =>
      (rule.confidence >= CONFIDENT || stated(rule)) &&
      rule.kind !== "note" &&
      rule.kind !== "duplicate",
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
                    className={`rounded-md p-1 text-muted-foreground hover:text-foreground ${quiet}`}
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
};
