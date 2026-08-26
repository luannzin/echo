"use client";

import type { SearchResult } from "@echo/search";
import { NotebookPen } from "lucide-react";
import { CommandItem } from "@/components/ui/command";
import { Marked } from "@/modules/search/_components/marked";
import { excerpt, type PaletteRow } from "@/modules/search/model";
import { formatStamp } from "@/shared/lib/time";

export const PaletteNote = ({
  row,
  result,
  terms,
  onOpen,
}: {
  row: PaletteRow;
  result: SearchResult;
  terms: string[];
  onOpen: () => void;
}) => {
  const line = excerpt(result.note, terms);

  return (
    <CommandItem value={row} onClick={onOpen} className="items-start gap-2.5 py-2">
      <NotebookPen aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate">
          <Marked text={result.note.title || "Untitled"} terms={terms} />
        </span>
        {/* The line the question actually matched, rather than the note's first line — the reason a
            result is a result is what proves it is one. */}
        {line ? (
          <span className="truncate text-muted-foreground text-xs">
            <Marked text={line} terms={terms} />
          </span>
        ) : null}
      </span>
      <span className="shrink-0 whitespace-nowrap font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
        {formatStamp(result.note.updatedAt)}
      </span>
    </CommandItem>
  );
};
