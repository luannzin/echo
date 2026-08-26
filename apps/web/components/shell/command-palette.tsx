"use client";

import type { EmbedderStatus } from "@echo/embeddings";
import type { SearchResult } from "@echo/search";
import type { Note } from "@echo/types";
import { type LucideIcon, NotebookPen } from "lucide-react";
import { type ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { formatStamp } from "@/lib/time";

export type PaletteCommand = {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  /** Words a reader might type to reach a command whose label they cannot remember. */
  keywords?: string;
  run: () => void;
};

/** One answer to the question, and which signals were available when it was given. */
export type SearchPass = {
  results: SearchResult[];
  /** `words` came from the text index alone; `meaning` had the model too. */
  stage: "words" | "meaning";
};

type Row =
  | { value: string; kind: "command"; command: PaletteCommand }
  | { value: string; kind: "note"; result: SearchResult };

type Group = { value: string; items: Row[] };

/**
 * One place to reach everything: a note by what it is about, or a command by its name.
 *
 * Search arrives in two passes. Words come back from the database's own index in a few
 * milliseconds, so there are results under the cursor almost as fast as it can be typed; meaning
 * follows a moment later and re-orders them. Nothing here ever waits on the model — a reader whose
 * model is still downloading gets the word search, and is told that is what they are looking at.
 */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
  onSearch,
  onOpenNote,
  model,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: PaletteCommand[];
  /** Calls back once per pass, best first. */
  onSearch: (query: string, receive: (pass: SearchPass) => void) => Promise<void>;
  onOpenNote: (noteId: string) => void;
  model: EmbedderStatus;
}) {
  const [query, setQuery] = useState("");
  const [pass, setPass] = useState<SearchPass | null>(null);
  const [searching, setSearching] = useState(false);
  /** Search runs on a local database. When that database cannot be opened, say so. */
  const [unavailable, setUnavailable] = useState(false);
  // Retrieval rides behind the keystroke, the same way it does in the composer.
  const settled = useDeferredValue(query);
  /** Which question the results on screen belong to, so a late answer cannot overwrite a newer one. */
  const asked = useRef(0);

  // A palette that remembers the last question is a palette that answers the wrong one.
  useEffect(() => {
    if (open) return;
    setQuery("");
    setPass(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const text = settled.trim();
    if (text.length === 0) {
      setPass(null);
      setSearching(false);
      return;
    }

    const question = ++asked.current;
    let current = true;
    setSearching(true);
    // Short: the first pass is a lookup against an index, not a scan, so there is very little to
    // protect the database from. This debounce exists to skip keystrokes, not to buy time.
    const timer = setTimeout(() => {
      void onSearch(text, (next) => {
        if (!current || question !== asked.current) return;
        setPass(next);
        setUnavailable(false);
      })
        .catch(() => current && setUnavailable(true))
        .finally(() => current && setSearching(false));
    }, 90);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [settled, open, onSearch]);

  const found = pass?.results ?? [];

  const groups = useMemo<Group[]>(() => {
    const text = query.trim().toLowerCase();
    const matching = commands.filter(
      (command) =>
        text.length === 0 ||
        `${command.label} ${command.keywords ?? ""}`.toLowerCase().includes(text),
    );

    const noteRows: Row[] = found.map((result) => ({
      value: result.note.id,
      kind: "note",
      result,
    }));
    const commandRows: Row[] = matching.map((command) => ({
      value: command.id,
      kind: "command",
      command,
    }));

    // With a question typed, notes are the answer and commands are the afterthought. Empty, it is
    // the other way round: nothing has been asked yet, so the palette offers what it can do.
    return (
      text.length > 0
        ? [
            { value: "Notes", items: noteRows },
            { value: "Commands", items: commandRows },
          ]
        : [{ value: "Commands", items: commandRows }]
    ).filter((group) => group.items.length > 0);
  }, [commands, found, query]);

  const terms = useMemo(() => words(query), [query]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* Near-instant on purpose. A palette is opened dozens of times a day from the keyboard, and
          waiting for it to arrive is the one thing it must never do. */}
      <CommandDialogPopup className="duration-100" aria-label="Search and commands">
        <Command items={groups} mode="none" value={query} onValueChange={setQuery}>
          <CommandInput placeholder="Search notes, or type a command…" />
          <CommandEmpty>
            {searching
              ? "Looking…"
              : unavailable
                ? "Search needs the local database, which could not be opened. Reload the page to try again."
                : query.trim()
                  ? "Nothing matches that."
                  : null}
          </CommandEmpty>
          <CommandList>
            {(group: Group) => (
              <CommandGroup key={group.value} items={group.items}>
                <CommandGroupLabel>{group.value}</CommandGroupLabel>
                <CommandCollection>
                  {(row: Row) =>
                    row.kind === "command" ? (
                      <CommandItem
                        key={row.value}
                        value={row}
                        onClick={() => {
                          onOpenChange(false);
                          row.command.run();
                        }}
                        className="gap-2.5"
                      >
                        {/* Sized here rather than inherited: the list primitive sets no icon size,
                            and a Lucide icon left alone renders at 24px beside 14px text. */}
                        <row.command.icon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                        <span className="truncate">{row.command.label}</span>
                        {row.command.shortcut ? (
                          <CommandShortcut>{row.command.shortcut}</CommandShortcut>
                        ) : null}
                      </CommandItem>
                    ) : (
                      <CommandItem
                        key={row.value}
                        value={row}
                        onClick={() => {
                          onOpenChange(false);
                          onOpenNote(row.result.note.id);
                        }}
                        className="items-start gap-2.5 py-2"
                      >
                        <NotebookPen
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate">
                            <Marked text={row.result.note.title || "Untitled"} terms={terms} />
                          </span>
                          {/* The line the question actually matched, rather than the note's first
                              line — the reason a result is a result is what proves it is one. */}
                          {excerpt(row.result.note, terms) ? (
                            <span className="truncate text-muted-foreground text-xs">
                              <Marked text={excerpt(row.result.note, terms)} terms={terms} />
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 whitespace-nowrap font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
                          {formatStamp(row.result.note.updatedAt)}
                        </span>
                      </CommandItem>
                    )
                  }
                </CommandCollection>
              </CommandGroup>
            )}
          </CommandList>
          <CommandFooter>
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move · <Kbd>Enter</Kbd> to open
            </span>
            {/* What the answer was made of. A reader whose model is still arriving should know the
                list is going to get better, not wonder why it is not better already. */}
            <span aria-live="polite">{describe(pass, model)}</span>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}

/** How this answer was reached, in as few words as it takes to be honest about it. */
function describe(pass: SearchPass | null, model: EmbedderStatus): string {
  if (pass === null || pass.results.length === 0) return "Searched on this device";
  if (pass.stage === "meaning") return "Words and meaning";
  if (model.state === "loading") return `Words · meaning at ${Math.round(model.progress * 100)}%`;
  if (model.state === "unavailable") return "Words only — the model could not be loaded";
  return "Words · meaning in a moment";
}

/** The words a reader typed, lowercased and stripped of punctuation, longest first. */
function words(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 1)
    .sort((a, b) => b.length - a.length);
}

/**
 * The stretch of the note worth showing under its title: the line a query term appears on, or the
 * body's opening when the match was semantic and no word matched at all.
 */
function excerpt(note: Note, terms: string[]): string {
  const [, ...rest] = note.content.split("\n");
  const body = rest.join(" ").trim();
  if (terms.length === 0 || body.length === 0) return body.slice(0, 140);

  const haystack = body.toLowerCase();
  const at = terms.map((term) => haystack.indexOf(term)).find((index) => index >= 0);
  if (at === undefined) return body.slice(0, 140);

  // A little room before the match, so it is read in context rather than as a fragment.
  const from = Math.max(0, at - 24);
  return `${from > 0 ? "…" : ""}${body.slice(from, from + 140)}`;
}

/**
 * The query's words, marked where they appear. Rendered as text nodes rather than as markup built
 * from the note — a note is the reader's own writing, and it is never treated as anything else.
 */
function Marked({ text, terms }: { text: string; terms: string[] }): ReactNode {
  if (terms.length === 0) return text;

  const haystack = text.toLowerCase();
  /** Which characters belong to a match. Overlapping terms simply mark the same characters twice. */
  const hit = new Uint8Array(text.length);
  let marked = false;
  for (const term of terms) {
    let at = haystack.indexOf(term);
    while (at !== -1) {
      hit.fill(1, at, at + term.length);
      marked = true;
      at = haystack.indexOf(term, at + term.length);
    }
  }
  if (!marked) return text;

  const parts: ReactNode[] = [];
  let start = 0;
  for (let index = 1; index <= text.length; index++) {
    if (index < text.length && hit[index] === hit[start]) continue;
    const piece = text.slice(start, index);
    parts.push(
      hit[start] === 1 ? (
        // `mark` rather than a span, so a screen reader can say a match is a match — and weighted
        // as well as coloured, because colour alone is not something every reader can read. No
        // background: a highlighter block through a list of results is louder than the results.
        <mark key={start} className="bg-transparent font-medium text-brand-bright">
          {piece}
        </mark>
      ) : (
        piece
      ),
    );
    start = index;
  }
  return parts;
}
