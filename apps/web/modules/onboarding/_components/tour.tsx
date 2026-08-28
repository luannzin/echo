"use client";

import { ArrowRight, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { anchorOf, type Spot, spotOf } from "@/modules/onboarding/anchors";
import { MILESTONES, type Milestone } from "@/modules/onboarding/progress";
import { Label } from "@/shared/_components/label";
import { copy } from "@/shared/lib/i18n";

/** How much room the light leaves around what it is lighting. */
const HALO = 8;
/** How wide the mark is allowed to be, and how far it stands off the thing it points at. */
const MARK = 296;
const OFFSET = 14;

const titleOf = (milestone: Milestone): string => {
  const words = copy().arrival.tour;
  if (milestone === "wrote") return words.wroteTitle;
  if (milestone === "read") return words.readTitle;
  if (milestone === "found") return words.foundTitle;
  if (milestone === "placed") return words.placedTitle;
  return words.settledTitle;
};

const bodyOf = (milestone: Milestone): string => {
  const words = copy().arrival.tour;
  if (milestone === "wrote") return words.wroteBody;
  if (milestone === "read") return words.readBody;
  if (milestone === "found") return words.foundBody;
  if (milestone === "placed") return words.placedBody;
  return words.settledBody;
};

/**
 * The guided tour: coach marks over the real interface.
 *
 * Two decisions carry it.
 *
 * **It advances when the reader does the thing.** The step is not a sentence to read; it is a note
 * to write, or one to find. The tour watches the same five milestones the checklist does
 * (`progress.ts`), all of which are read back out of the notebook, so it cannot congratulate anyone
 * for something they did not do and cannot fail to notice something they did on their own while it
 * was pointing elsewhere.
 *
 * Next is there anyway, and it is not a contradiction. One of the five is not the reader's to force:
 * whether echo *found* anything depends on what they happened to write, and a first note with no
 * date and no task in it would leave the tour pointing at an empty row indefinitely. Doing the thing
 * is how a step is meant to end; Next is how a reader who does not want to is never stuck.
 *
 * **It never takes the interface away.** The light is a ring with a hole in it and no pointer
 * events, so whatever it is pointing at stays clickable underneath. A tour that has to be dismissed
 * before the thing it is describing can be tried is a slideshow.
 *
 * A step whose anchor is not on screen — a rail that is folded away on a phone — is skipped rather
 * than drawn in a corner and hoped about.
 */
export const Tour = ({
  done,
  onFinish,
}: {
  /** Which milestones this notebook has already reached. */
  done: ReadonlySet<Milestone>;
  onFinish: () => void;
}) => {
  const words = copy().arrival.tour;
  const titleId = useId();
  const bodyId = useId();
  const [spot, setSpot] = useState<Spot | null>(null);
  /**
   * The floor: the tour never shows a step before this one again. Milestones being reached raise
   * it, and so does Next. Nothing lowers it.
   */
  const [at, setAt] = useState(0);

  /**
   * The step being shown: the first milestone from here on that is not already reached and whose
   * anchor is actually on screen.
   */
  const remaining = MILESTONES.slice(at).filter((milestone) => !done.has(milestone));
  const step = remaining[0] ?? null;
  const finished = step === null;

  // Walking past what the reader has already done, so `at` is where the tour is rather than a
  // number that has to agree with the list.
  useEffect(() => {
    const reachedHere = MILESTONES.findIndex(
      (milestone, index) => index >= at && !done.has(milestone),
    );
    if (reachedHere > at) setAt(reachedHere);
    if (reachedHere === -1) setAt(MILESTONES.length);
  }, [done, at]);

  // Where the light goes. Measured after layout, and again whenever anything could have moved it:
  // the panels animate, the window resizes, and a phone scrolls the whole document.
  useLayoutEffect(() => {
    if (step === null) return;

    const measure = () => setSpot(spotOf(anchorOf(step)));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    // The panels transition over 200ms; one more measurement after that settles the light where the
    // control actually ended up rather than where it was leaving from.
    const settle = setTimeout(measure, 260);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      clearTimeout(settle);
    };
  }, [step]);

  // The mark is the thing being read, so it is the thing that gets the focus — and Escape ends the
  // tour from anywhere, including from the middle of a sentence in the composer behind it.
  useEffect(() => {
    if (finished) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFinish();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finished, onFinish]);

  if (finished) return <Farewell titleId={titleId} bodyId={bodyId} onFinish={onFinish} />;

  // A step that has nothing to point at is a step that waits: the reader may be on a phone with the
  // rail folded, and the milestone is still reachable by another route.
  if (spot === null) return null;

  const below = spot.top < window.innerHeight / 2;
  const left = Math.min(
    Math.max(spot.left + spot.width / 2 - MARK / 2, 12),
    window.innerWidth - MARK - 12,
  );
  const top = below ? spot.top + spot.height + OFFSET : spot.top - OFFSET;

  return (
    <>
      {/*
        One element, no mask and no second tree: a ring of shadow big enough to reach every corner,
        with the anchor's own rectangle punched out of the middle. Moving between steps transitions
        the rectangle, so the light travels rather than cutting — and `pointer-events: none` is what
        keeps the control underneath clickable the whole time.
      */}
      <div
        aria-hidden="true"
        style={{
          top: spot.top - HALO,
          left: spot.left - HALO,
          width: spot.width + HALO * 2,
          height: spot.height + HALO * 2,
        }}
        // The scrim is the same black/50 the panels dim the screen with, one step darker
        // because this one has to read as a spotlight rather than as a curtain.
        className="pointer-events-none fixed z-[60] rounded-xl ring-1 ring-brand-bright/50 transition-[top,left,width,height] duration-300 ease-[var(--ease-out-quart)] [box-shadow:0_0_0_100vmax_rgb(0_0_0/0.62)]"
      />

      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        style={{ left, top, width: MARK, transform: below ? undefined : "translateY(-100%)" }}
        className="animate-rise fixed z-[61] rounded-xl border border-border bg-card p-4 shadow-2xl shadow-black/50 transition-[top,left] duration-300 ease-[var(--ease-out-quart)]"
      >
        <div className="flex items-baseline justify-between gap-3 pb-1.5">
          <Label>{words.of(MILESTONES.indexOf(step) + 1, MILESTONES.length)}</Label>
          <Button
            size="sm"
            variant="ghost"
            onClick={onFinish}
            className="-me-2 -mt-1 h-7 gap-1 text-muted-foreground text-xs"
          >
            {words.skip}
            <X aria-hidden="true" className="size-3" />
          </Button>
        </div>
        <h2 id={titleId} className="font-display text-xl tracking-tight">
          {titleOf(step)}
        </h2>
        <p id={bodyId} className="pt-1.5 text-muted-foreground text-sm leading-relaxed">
          {bodyOf(step)}
        </p>
        {/* Quiet, and to one side: doing the thing is the way through, and this is the way past. */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setAt(MILESTONES.indexOf(step) + 1)}
          className="-ms-2 mt-2 h-7 gap-1 text-muted-foreground text-xs"
        >
          {words.next}
          <ArrowRight aria-hidden="true" className="size-3" />
        </Button>
      </div>

      {/* The step change, announced. The mark is not focused — the caret belongs in the composer
          the first step is asking them to type in — so this is how it reaches a screen reader. */}
      <p aria-live="polite" className="sr-only">
        {titleOf(step)}. {bodyOf(step)}
      </p>
    </>
  );
};

/** The end of it, in the middle of the screen, because nothing is being pointed at any more. */
const Farewell = ({
  titleId,
  bodyId,
  onFinish,
}: {
  titleId: string;
  bodyId: string;
  onFinish: () => void;
}) => {
  const words = copy().arrival.tour;

  return (
    <div className="pointer-events-none fixed inset-0 z-[61] flex items-end justify-center p-6 sm:items-center">
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="animate-rise pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl shadow-black/50"
      >
        <h2 id={titleId} className="font-display text-2xl tracking-tight">
          {words.doneTitle}
        </h2>
        <p id={bodyId} className="pt-2 text-muted-foreground text-sm leading-relaxed">
          {words.doneBody}
        </p>
        <Button
          // The one place in the tour something has to be pressed: there is no sixth thing to do,
          // so there is nothing left for the reader to do that could dismiss this on its own.
          ref={(element) => element?.focus()}
          onClick={onFinish}
          className="mt-4"
        >
          {words.done}
        </Button>
      </div>
    </div>
  );
};
