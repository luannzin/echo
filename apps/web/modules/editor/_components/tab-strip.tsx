"use client";

import type { Note } from "@echo/types";
import { X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

/**
 * The notes you have open, in the order you opened them or the order you dragged them into. Nothing
 * about a note moves its tab — a stream sorted by when you last touched something is what the other
 * mode is for.
 */
export const TabStrip = ({
  session,
  noteOf,
  active,
  secondary,
  onSelect,
  onClose,
  onMove,
}: {
  session: readonly string[];
  noteOf: (noteId: string) => Note | undefined;
  active: string | null;
  /** What the second pane is showing, so a split names both of its notes in the strip. */
  secondary: string | null;
  onSelect: (noteId: string) => void;
  onClose: (noteId: string) => void;
  onMove: (noteId: string, targetId: string) => void;
}) => {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  return (
    // The scrollbar is hidden rather than styled: it is drawn over the tabs on the platforms that
    // overlay it, so the strip grew a bar under the pointer exactly when the pointer was aiming at
    // a tab. The strip still scrolls — the wheel and the tab that scrolls itself into view do it.
    <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {session.map((noteId) => (
        <Tab
          key={noteId}
          noteId={noteId}
          title={noteOf(noteId)?.title || "New note"}
          active={noteId === active}
          beside={noteId === secondary}
          dragging={noteId === dragging}
          over={over === noteId && dragging !== null && dragging !== noteId}
          onSelect={onSelect}
          onClose={onClose}
          onDragStart={() => setDragging(noteId)}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
          }}
          onDragOver={() => setOver(noteId)}
          onDrop={() => {
            if (dragging) onMove(dragging, noteId);
            setDragging(null);
            setOver(null);
          }}
        />
      ))}
    </div>
  );
};

const Tab = memo(
  ({
    noteId,
    title,
    active,
    beside,
    dragging,
    over,
    onSelect,
    onClose,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
  }: {
    noteId: string;
    title: string;
    active: boolean;
    beside: boolean;
    dragging: boolean;
    over: boolean;
    onSelect: (noteId: string) => void;
    onClose: (noteId: string) => void;
    onDragStart: () => void;
    onDragEnd: () => void;
    onDragOver: () => void;
    onDrop: () => void;
  }) => {
    const shell = useRef<HTMLDivElement>(null);

    // A new note is opened at the end of a strip that may already be wider than the window, so the
    // tab brings itself into view. `nearest` on both axes: this must never scroll anything but the
    // strip, and a tab already on screen must not be moved under the pointer.
    useEffect(() => {
      if (active) shell.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
    }, [active]);

    return (
      // The close control cannot live inside the tab's own button, so the two sit side by side in a
      // wrapper that only draws. Every handler is on a real control: the name carries the drag, the
      // same way a folder row does.
      <div
        ref={shell}
        className={`group flex min-w-0 shrink-0 items-center gap-1 rounded-t-lg ps-1.5 transition-[background-color,opacity,box-shadow] duration-150 ${
          active || beside ? "bg-card" : "hover:bg-card/50"
        } ${dragging ? "opacity-40" : ""} ${
          over ? "shadow-[inset_2px_0_0_0_var(--color-brand-bright)]" : ""
        }`}
      >
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", title);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          onDragOver={(event) => {
            event.preventDefault();
            onDragOver();
          }}
          onDrop={(event) => {
            event.preventDefault();
            onDrop();
          }}
          onClick={() => onSelect(noteId)}
          aria-current={active ? "page" : undefined}
          title={title}
          className={`max-w-52 truncate rounded-md py-2.5 pe-1 ps-2 text-start text-[0.8125rem] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring ${
            active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
          }`}
        >
          {title}
        </button>
        <button
          type="button"
          aria-label={`Close ${title}`}
          onClick={() => onClose(noteId)}
          // Always reachable by keyboard, and on a phone, where there is no hover to reveal it.
          className="me-1.5 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 outline-none transition-opacity duration-150 pointer-coarse:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 hover:text-foreground"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    );
  },
);
Tab.displayName = "Tab";
