"use client";

import { adjust, type LearnedRule, ruleFor } from "@echo/learning";
import type { LearningEventCreate } from "@echo/types";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { explain, type Signal, WORTH_SAYING } from "@/modules/capture/signals";

export type Answer = "accepted" | "rejected";

export const SignalChip = ({
  signal,
  rules,
  answer,
  onCorrect,
}: {
  signal: Signal;
  rules: LearnedRule[];
  answer: Answer | undefined;
  onCorrect: (event: LearningEventCreate, answer: Answer) => void;
}) => {
  const rule = ruleFor(rules, signal.kind, signal.trigger);
  if (answer === "rejected") return null;
  if (answer !== "accepted" && adjust(signal.detected, rule) < WORTH_SAYING) return null;

  const correct = (type: "signal_accepted" | "signal_rejected", answered: Answer) =>
    onCorrect({ type, kind: signal.kind, subject: signal.trigger, noteId: null }, answered);

  return (
    <Menu>
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
        <MenuItem closeOnClick onClick={() => correct("signal_accepted", "accepted")}>
          <Check aria-hidden="true" />
          Yes, that&rsquo;s right
        </MenuItem>
        <MenuItem closeOnClick onClick={() => correct("signal_rejected", "rejected")}>
          <X aria-hidden="true" />
          {signal.kind === "task-phrase" ? "Not a task" : "Not a deadline"}
        </MenuItem>
        <MenuSeparator />
        <p className="px-2 py-1.5 text-muted-foreground text-xs leading-5">
          {explain(signal, rule)}
        </p>
      </MenuPopup>
    </Menu>
  );
};
