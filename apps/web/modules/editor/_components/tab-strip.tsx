"use client";

import type { Note } from "@echo/types";
import { Pin, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MenuNote } from "@/shared/_components/menu-note";
import { copy } from "@/shared/lib/i18n";

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
  onPin,
}: {
  session: readonly string[];
  noteOf: (noteId: string) => Note | undefined;
  active: string | null;
  /** What the second pane is showing, so a split names both of its notes in the strip. */
  secondary: string | null;
  onSelect: (noteId: string) => void;
  onClose: (noteId: string) => void;
  onMove: (noteId: string, targetId: string) => void;
  /** Lifts the tab off the window and onto the desktop as a sticky note. Absent off the desktop. */
  onPin?: (noteId: string) => void;
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
          title={noteOf(noteId)?.title || copy().editor.newNoteTab}
          active={noteId === active}
          beside={noteId === secondary}
          dragging={noteId === dragging}
          over={over === noteId && dragging !== null && dragging !== noteId}
          onSelect={onSelect}
          onClose={onClose}
          onPin={onPin}
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
    onPin,
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
    onPin?: (noteId: string) => void;
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
      <ContextMenu>
        {/*
          The close control cannot live inside the tab's own button, so the two sit side by side in
          a wrapper that only draws. Every handler is on a real control: the name carries the drag,
          the same way a folder row does. The wrapper is what the right click lands on, so the menu
          answers anywhere across the tab.
        */}
        <ContextMenuTrigger
          render={<div ref={shell} />}
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
            // Middle click closes it, the way it closes a browser tab. `onMouseDown` is where the
            // autoscroll cursor would otherwise open, and it opens before the click ever lands.
            onMouseDown={(event) => {
              if (event.button === 1) event.preventDefault();
            }}
            onAuxClick={(event) => {
              if (event.button !== 1) return;
              event.preventDefault();
              onClose(noteId);
            }}
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
            aria-label={copy().editor.closeNamed(title)}
            onClick={() => onClose(noteId)}
            // Always reachable by keyboard, and on a phone, where there is no hover to reveal it.
            className="me-1.5 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 outline-none transition-opacity duration-150 pointer-coarse:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 hover:text-foreground"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </ContextMenuTrigger>

        <ContextMenuPopup align="start" className="max-w-64">
          {onPin === undefined ? null : (
            <ContextMenuItem closeOnClick onClick={() => onPin(noteId)}>
              <Pin aria-hidden="true" />
              {copy().editor.pinToDesktop}
            </ContextMenuItem>
          )}
          <ContextMenuItem closeOnClick onClick={() => onClose(noteId)}>
            <X aria-hidden="true" />
            {copy().editor.closeTab}
          </ContextMenuItem>
          {onPin === undefined ? null : <MenuNote>{copy().editor.stickyNoteHint}</MenuNote>}
        </ContextMenuPopup>
      </ContextMenu>
    );
  },
);
Tab.displayName = "Tab";
