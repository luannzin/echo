"use client";

import { type LearnedRule, ruleFor } from "@echo/learning";
import type { LearningEventCreate } from "@echo/types";
import { Check, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { believes, explain, type Signal, signalLabel } from "@/modules/capture/signals";
import { MenuNote } from "@/shared/_components/menu-note";
import { copy } from "@/shared/lib/i18n";

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
  const words = copy().signals;
  const rule = ruleFor(rules, signal.kind, signal.trigger);
  if (answer === "rejected") return null;
  if (answer !== "accepted" && !believes(signal, rules)) return null;

  const correct = (type: "signal_accepted" | "signal_rejected", answered: Answer) =>
    onCorrect({ type, kind: signal.kind, subject: signal.trigger, noteId: null }, answered);

  return (
    <Menu>
      <MenuTrigger
        render={
          <Badge
            render={<button type="button" />}
            variant="secondary"
            className="animate-settle gap-1.5 font-normal outline-none transition-transform duration-150 ease-[var(--ease-out-quart)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.97]"
          />
        }
      >
        <span aria-hidden="true" className={`size-1.5 rounded-full ${signal.tone}`} />
        {signalLabel(signal)}
        <ChevronDown aria-hidden="true" className="size-3 text-muted-foreground" />
      </MenuTrigger>
      <MenuPopup align="start" className="max-w-64">
        <MenuItem closeOnClick onClick={() => correct("signal_accepted", "accepted")}>
          <Check aria-hidden="true" />
          {words.thatIsRight}
        </MenuItem>
        <MenuItem closeOnClick onClick={() => correct("signal_rejected", "rejected")}>
          <X aria-hidden="true" />
          {signal.kind === "task-phrase" ? words.notATask : words.notADeadline}
        </MenuItem>
        <MenuSeparator />
        <MenuNote>{explain(signal, rule)}</MenuNote>
      </MenuPopup>
    </Menu>
  );
};
