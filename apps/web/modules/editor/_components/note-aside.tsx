"use client";

import type { Note } from "@echo/types";
import { Label } from "@/shared/_components/label";
import { numeric, row } from "@/shared/lib/styles";
import { formatStamp } from "@/shared/lib/time";

/**
 * How you reach a note that has no tab yet. A flat list and nothing else — no folders, no drag, no
 * menus, because this is the mode you chose to get away from those.
 *
 * There is no field to narrow it either: finding a note by what it says is what the palette is for,
 * and it is one keystroke away from here.
 */
export const NoteAside = ({
  notes,
  open,
  activeId,
  onOpenNote,
  onDismiss,
}: {
  notes: Note[];
  open: boolean;
  activeId: string | null;
  onOpenNote: (noteId: string) => void;
  onDismiss: () => void;
}) => (
  <aside
    aria-label="Notes"
    inert={!open}
    onMouseLeave={onDismiss}
    // Slides rather than takes width: the panes beside it keep their measurements, so opening
    // this never reflows the words someone is in the middle of writing.
    className={`absolute inset-y-0 start-0 z-30 flex w-72 flex-col border-e bg-sidebar shadow-2xl shadow-black/40 transition-transform duration-200 ease-[var(--ease-out-quart)] ${
      open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
    }`}
  >
    <div className="shrink-0 px-3 pt-3 pb-2">
      <Label>Notes</Label>
    </div>

    <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
      {notes.length === 0 ? (
        <li className="px-2 py-1 text-muted-foreground text-sm leading-relaxed">
          Nothing written yet.
        </li>
      ) : (
        notes.map((note) => (
          // Off screen the browser is told how tall a row is rather than laying it out. The list
          // is every note there is, and it is opened by someone mid-sentence.
          <li
            key={note.id}
            style={{ contentVisibility: "auto", containIntrinsicSize: "auto 34px" }}
          >
            <button
              type="button"
              onClick={() => onOpenNote(note.id)}
              aria-current={note.id === activeId ? "page" : undefined}
              title={note.title || "Untitled"}
              className={`${row} w-full gap-2 px-2 ${
                note.id === activeId
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{note.title || "Untitled"}</span>
              <span className={`shrink-0 text-[0.625rem] text-muted-foreground/80 ${numeric}`}>
                {formatStamp(note.updatedAt)}
              </span>
            </button>
          </li>
        ))
      )}
    </ul>
  </aside>
);
