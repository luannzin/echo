"use client";

import { adjust, type LearnedRule, ruleFor } from "@echo/learning";
import type { ParseResult } from "@echo/parser";
import type { LearningEventCreate } from "@echo/types";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";

/** Under this, echo has been told often enough that it should stop mentioning it. */
const WORTH_SAYING = 0.4;

export type Signal = {
  kind: "task-phrase" | "deadline-phrase";
  /** The phrase that gave it away — what a correction is filed under. */
  trigger: string;
  label: string;
  /** Colour is meaning here: blue is echo's one accent, amber is time running out. */
  tone: string;
  /** What the parser thought, before anything this reader has taught echo. */
  detected: number;
};

/**
 * What echo noticed in what is being written, and nothing more than that. A signal is a read-out,
 * not a decision: nothing here changes the note, and every one of them can be told it is wrong.
 */
export function readSignals(parsed: ParseResult): Signal[] {
  const signals: Signal[] = [];
  const task = parsed.tasks[0];

  if (task) {
    signals.push({
      kind: "task-phrase",
      trigger: task.trigger,
      label: "Task",
      tone: "bg-brand-bright",
      detected: task.confidence,
    });
  }

  // Only a deadline earns a chip. A date merely mentioned stays quiet, because one good suggestion
  // beats three noisy ones.
  if (parsed.deadline?.marker) {
    signals.push({
      kind: "deadline-phrase",
      trigger: parsed.deadline.marker,
      label: `Due ${parsed.deadline.text}`,
      tone: "bg-warning",
      detected: 0.8,
    });
  }

  return signals;
}

export function Signals({
  signals,
  rules,
  settled,
  onCorrect,
}: {
  signals: Signal[];
  /** What this reader has taught echo, which is allowed to quiet a signal but never to invent one. */
  rules: LearnedRule[];
  /** Signals already answered in this draft: accepted stay, rejected are gone. */
  settled: Record<string, "accepted" | "rejected">;
  onCorrect: (event: LearningEventCreate, answer: "accepted" | "rejected") => void;
}) {
  return (
    <>
      {signals.map((signal) => {
        const rule = ruleFor(rules, signal.kind, signal.trigger);
        const answer = settled[`${signal.kind}:${signal.trigger}`];
        if (answer === "rejected") return null;
        if (answer !== "accepted" && adjust(signal.detected, rule) < WORTH_SAYING) return null;

        return (
          <Menu key={`${signal.kind}:${signal.trigger}`}>
            <MenuTrigger
              render={
                <Badge
                  render={<button type="button" />}
                  variant={answer === "accepted" ? "secondary" : "outline"}
                  className="animate-settle gap-1.5 font-normal outline-none transition-transform duration-150 ease-[var(--ease-out-quart)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.97]"
                />
              }
            >
              {answer === "accepted" ? (
                <Check aria-hidden="true" className="size-3 text-brand-bright" />
              ) : (
                <span aria-hidden="true" className={`size-1.5 rounded-full ${signal.tone}`} />
              )}
              {signal.label}
            </MenuTrigger>
            <MenuPopup align="start" className="max-w-64">
              <MenuItem
                closeOnClick
                onClick={() =>
                  onCorrect(
                    {
                      type: "signal_accepted",
                      kind: signal.kind,
                      subject: signal.trigger,
                      noteId: null,
                    },
                    "accepted",
                  )
                }
              >
                <Check aria-hidden="true" />
                Yes, that&rsquo;s right
              </MenuItem>
              <MenuItem
                closeOnClick
                onClick={() =>
                  onCorrect(
                    {
                      type: "signal_rejected",
                      kind: signal.kind,
                      subject: signal.trigger,
                      noteId: null,
                    },
                    "rejected",
                  )
                }
              >
                <X aria-hidden="true" />
                {signal.kind === "task-phrase" ? "Not a task" : "Not a deadline"}
              </MenuItem>
              <MenuSeparator />
              {/* The "why" behind a suggestion, in the reader's own words rather than a score. */}
              <p className="px-2 py-1.5 text-muted-foreground text-xs leading-5">
                {why(signal, rule)}
              </p>
            </MenuPopup>
          </Menu>
        );
      })}
    </>
  );
}

function why(signal: Signal, rule: LearnedRule | undefined): string {
  const read =
    signal.trigger === "checkbox"
      ? "A ticked box reads as something to do."
      : `“${signal.trigger}” reads as ${signal.kind === "task-phrase" ? "something to do" : "a limit to work against"}.`;

  if (!rule) return read;
  return rule.outcome === "accept"
    ? `${read} You have agreed ${rule.support === 1 ? "once" : `${rule.support} times`}.`
    : `${read} You have said otherwise ${rule.support === 1 ? "once" : `${rule.support} times`}, so echo is less sure.`;
}
