"use client";

import { CornerDownLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { Frame, FramePanel } from "@/components/ui/frame";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/shared/_components/label";
import { SlashOption } from "@/shared/_components/slash-option";
import type { CaretPoint } from "@/shared/lib/caret-point";
import { copy } from "@/shared/lib/i18n";
import type { SlashCommand } from "@/shared/lib/slash";

const WIDTH = 320;
/** Roughly what the list stands in when it is full. Below this much room it opens downwards. */
const REACH = 280;

/** What each half of the list is for, in the writer's terms rather than the code's. */
const GROUPS = [
  { id: "write", holds: (command: SlashCommand) => command.action.kind !== "note" },
  { id: "note", holds: (command: SlashCommand) => command.action.kind === "note" },
] as const;

/** What pressing Enter will do, said in the words of the thing it is about to ask for. */
const asksFor = (takes: SlashCommand["takes"]): string => {
  const words = copy().slash;
  if (takes === "date") return words.toSayWhen;
  if (takes === "name") return words.toNameIt;
  return words.forTheNextStep;
};

/**
 * The `/` menu: what you can write and what you can do, beside the caret that asked.
 *
 * It never takes focus — the caret stays in the words, and typing keeps narrowing the list, which is
 * the whole difference between this and a dialog. That means the surface below has to lend it its
 * accessibility: `aria-activedescendant` on the textarea points at the row named here.
 *
 * It has two states. Choosing a command is a list in two halves — what goes into the words, and what
 * happens to the note. A command that takes words drops into the second: one row, and everything
 * underneath given over to what echo makes of what is being typed.
 */
export const SlashMenu = ({
  id,
  commands,
  active,
  argument,
  point,
  room,
  reading,
  onPick,
}: {
  id: string;
  commands: readonly SlashCommand[];
  active: number;
  /** The words being typed for a command that takes some. Null while one is still being chosen. */
  argument: string | null;
  point: CaretPoint;
  /** How wide the surface is, so a menu opened at the end of a long line stays on screen. */
  room: number;
  /** What echo makes of the argument being typed, for the commands that take one. */
  reading: string | null;
  onPick: (command: SlashCommand) => void;
}) => {
  const words = copy().slash;
  const list = useRef<HTMLDivElement>(null);

  // Arrowing past the end of a scrolled list has to bring the row with it.
  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>("[data-active='true']")
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // Opens upwards, which is where the writing is not. Downwards only when there is no room above.
  const below = point.top < REACH;
  const chosen = commands[active];
  const asking = argument === null && chosen?.takes !== undefined;
  /** Words are only worth acting on once there are some — until then the strip only prompts. */
  const ready = argument !== null && argument.trim().length > 0;

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
              The keyboard is answered there too, which is why there is no key handler on a row.
            */}
            <div
              ref={list}
              id={id}
              role="listbox"
              aria-label={words.commands}
              className="max-h-64 overflow-y-auto"
            >
              {argument !== null
                ? commands.map((command) => (
                    <SlashOption
                      key={command.id}
                      command={command}
                      id={id}
                      at={0}
                      active
                      argument={argument}
                      onPick={() => onPick(command)}
                    />
                  ))
                : GROUPS.map((group) => {
                    const held = commands.filter(group.holds);
                    if (held.length === 0) return null;
                    return (
                      <div key={group.id} className="pb-0.5 last:pb-0">
                        <p className="px-2 pt-1.5 pb-1">
                          <Label>{group.id === "write" ? words.write : words.thisNote}</Label>
                        </p>
                        {held.map((command) => {
                          const at = commands.indexOf(command);
                          return (
                            <SlashOption
                              key={command.id}
                              command={command}
                              id={id}
                              at={at}
                              active={at === active}
                              argument={null}
                              onPick={() => onPick(command)}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
            </div>
          </FramePanel>

          <FramePanel className="flex items-center justify-between gap-3 px-2.5 py-1.5">
            {/*
              One slot, three things it can be saying: what echo makes of the words being typed,
              that Enter is about to ask for some, or how to drive the list.
            */}
            {reading !== null ? (
              <>
                <p className="min-w-0 truncate">
                  <Label>
                    <span className="text-foreground/75">{reading}</span>
                  </Label>
                </p>
                {ready ? (
                  <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                    <CornerDownLeft aria-hidden="true" className="size-3" />
                    <Label>{words.use}</Label>
                  </span>
                ) : null}
              </>
            ) : asking ? (
              <p>
                <Label>
                  <Kbd>↵</Kbd> <span className="text-foreground/75">{asksFor(chosen?.takes)}</span>
                </Label>
              </p>
            ) : (
              <p>
                <Label>
                  <Kbd>↑</Kbd> <Kbd>↓</Kbd> {words.choose} · <Kbd>↵</Kbd> / <Kbd>space</Kbd>{" "}
                  {words.use} · <Kbd>{words.escape}</Kbd>
                </Label>
              </p>
            )}
          </FramePanel>
        </Frame>
      </div>
    </div>
  );
};
