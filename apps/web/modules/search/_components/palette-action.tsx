"use client";

import { CommandItem, CommandShortcut } from "@/components/ui/command";
import type { PaletteCommand, PaletteRow } from "@/modules/search/model";

export const PaletteAction = ({
  row,
  command,
  onRun,
}: {
  row: PaletteRow;
  command: PaletteCommand;
  onRun: () => void;
}) => (
  <CommandItem value={row} onClick={onRun} className="gap-2.5">
    {/* Sized here rather than inherited: the list primitive sets no icon size, and a Lucide icon
        left alone renders at 24px beside 14px text. */}
    <command.icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    <span className="truncate">{command.label}</span>
    {command.shortcut ? <CommandShortcut>{command.shortcut}</CommandShortcut> : null}
  </CommandItem>
);
