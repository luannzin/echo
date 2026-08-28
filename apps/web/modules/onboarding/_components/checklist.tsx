"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MILESTONES, type Milestone } from "@/modules/onboarding/progress";
import { Label } from "@/shared/_components/label";
import { copy } from "@/shared/lib/i18n";
import { quiet } from "@/shared/lib/styles";

const labelOf = (milestone: Milestone): string => copy().arrival.checklist[milestone];

/**
 * The five first things, and which of them this notebook has already done.
 *
 * Every tick is read back out of the notes rather than counted (`progress.ts`), so it is true for a
 * reader who arrived before any of this existed and true for one who ignored the tour and did the
 * whole thing by hand.
 *
 * It lives at the foot of the notes panel, and it is dismissible forever. A permanent list of
 * chores beside the writing is a permanent tax on the one thing the product is for.
 */
export const Checklist = ({
  done,
  onDismiss,
}: {
  done: ReadonlySet<Milestone>;
  onDismiss: () => void;
}) => {
  const words = copy().arrival.checklist;
  const count = MILESTONES.filter((milestone) => done.has(milestone)).length;

  return (
    <section className="group/list shrink-0 border-t px-4 py-3">
      <div className="flex items-center justify-between gap-2 pb-2">
        <Label>{count === MILESTONES.length ? words.finished : words.title}</Label>
        <div className="flex items-center gap-1">
          <Label>{words.of(count, MILESTONES.length)}</Label>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={words.hide}
            onClick={onDismiss}
            className={`-me-1.5 size-6 text-muted-foreground ${quiet}`}
          >
            <X aria-hidden="true" className="size-3" />
          </Button>
        </div>
      </div>

      <ul className="flex flex-col gap-1">
        {MILESTONES.map((milestone) => {
          const ticked = done.has(milestone);
          return (
            <li key={milestone} className="flex items-center gap-2 text-xs leading-5">
              <Tick ticked={ticked} />
              <span
                className={
                  ticked ? "text-muted-foreground/60 line-through" : "text-muted-foreground"
                }
              >
                {labelOf(milestone)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

/**
 * A tick that draws itself.
 *
 * `stroke-dashoffset` rather than a glyph that appears: the mark is the reward, and a checkmark that
 * simply exists on the next render is not one. Reduced motion collapses the duration to nothing in
 * `globals.css`, which leaves the finished mark — the state the element is declared in either way.
 */
const Tick = ({ ticked }: { ticked: boolean }) => (
  <span
    aria-hidden="true"
    className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
      ticked ? "border-brand-bright/60 bg-brand-bright/15" : "border-border"
    }`}
  >
    <svg viewBox="0 0 12 12" className="size-2.5" fill="none">
      <title>{ticked ? "done" : "not done"}</title>
      <path
        d="M2 6.5 L4.8 9 L10 3"
        stroke="var(--color-brand-bright)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        style={{
          strokeDashoffset: ticked ? 0 : 1,
          transition: "stroke-dashoffset 320ms var(--ease-out-quart)",
        }}
      />
    </svg>
  </span>
);
