"use client";

import { useEffect, useRef } from "react";
import { Frame, FramePanel } from "@/components/ui/frame";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/shared/_components/label";
import type { CaretPoint } from "@/shared/lib/caret-point";
import type { SlashCommand } from "@/shared/lib/slash";

const WIDTH = 288;
/** Roughly what the list stands in when it is full. Below this much room it opens downwards. */
const REACH = 260;

/** Where a row lives in the accessibility tree, so the textarea can point the reader at it. */
export const slashOptionId = (base: string, at: number): string => `${base}-option-${at}`;

/**
 * The `/` menu: what you can write and what you can do, beside the caret that asked.
 *
 * It never takes focus — the caret stays in the words, and typing keeps narrowing the list, which is
 * the whole difference between this and a dialog. That means the surface below has to lend it its
 * accessibility: `aria-activedescendant` on the textarea points at the row named here.
 */
export const SlashMenu = ({
  id,
  commands,
  active,
  point,
  room,
  reading,
  onPick,
}: {
  id: string;
  commands: readonly SlashCommand[];
  active: number;
  point: CaretPoint;
  /** How wide the surface is, so a menu opened at the end of a long line stays on screen. */
  room: number;
  /** What echo makes of the argument being typed, for the commands that take one. */
  reading: string | null;
  onPick: (command: SlashCommand) => void;
}) => {
  const list = useRef<HTMLDivElement>(null);

  // Arrowing past the end of a scrolled list has to bring the row with it.
  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>("[data-active='true']")
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // Opens upwards, which is where the writing is not. Downwards only when there is no room above.
  const below = point.top < REACH;

  return (
    <div
      style={{ top: point.top, left: Math.max(0, Math.min(point.left, room - WIDTH)) }}
      className="pointer-events-none absolute z-40"
    >
      <div
        // Opening downwards clears the line being written by that line's own height, rather than by
        // a guess at how tall a line is.
        style={{ width: WIDTH, top: below ? point.height + 8 : undefined }}
        className={`animate-rise pointer-events-auto absolute start-0 ${below ? "" : "bottom-2"}`}
      >
        <Frame className="shadow-2xl shadow-black/50">
          <FramePanel className="p-1">
            {/*
              Divs rather than a list of buttons: a row here is never focused — the caret stays in
              the words, and the textarea points at the current row with `aria-activedescendant`.
              The keyboard is handled there too, which is why there is no key handler on a row.
            */}
            <div
              ref={list}
              id={id}
              role="listbox"
              aria-label="Commands"
              className="max-h-56 overflow-y-auto"
            >
              {commands.map((command, at) => (
                // biome-ignore lint/a11y/useFocusableInteractive: a listbox option under `aria-activedescendant` is never focused — the textarea holds focus throughout
                // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard is answered by the textarea, which owns the caret and the selection
                <div
                  key={command.id}
                  id={slashOptionId(id, at)}
                  role="option"
                  aria-selected={at === active}
                  data-active={at === active}
                  // The caret must not leave the words: pressing here is choosing, not focusing.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onPick(command)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-start transition-colors duration-100 ${
                    at === active
                      ? "bg-brand-bright/15 text-foreground"
                      : "text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <command.icon
                    aria-hidden="true"
                    className={`size-4 shrink-0 ${at === active ? "text-brand-bright" : ""}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{command.label}</span>
                  <span className="shrink-0 font-mono text-[0.6875rem] text-muted-foreground/70">
                    {command.hint}
                  </span>
                </div>
              ))}
            </div>
          </FramePanel>

          <FramePanel className="flex items-center justify-between gap-2 px-2.5 py-1.5">
            {/* One slot: what echo makes of what is being typed, or how to drive the list. */}
            {reading === null ? (
              <p className="flex items-center gap-1.5">
                <Label>
                  <Kbd>↑</Kbd> <Kbd>↓</Kbd> to choose · <Kbd>↵</Kbd> to use · <Kbd>esc</Kbd>
                </Label>
              </p>
            ) : (
              <p className="min-w-0 truncate">
                <Label>
                  <span className="text-foreground/70">{reading}</span>
                </Label>
              </p>
            )}
          </FramePanel>
        </Frame>
      </div>
    </div>
  );
};
