"use client";

import { buildTree, type FolderNode, flattenTree, subtreeIds } from "@echo/core";
import type { Folder, Note } from "@echo/types";
import {
  ChevronRight,
  FolderPlus,
  Inbox,
  type LucideIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import { NoteList } from "@/components/notes/note-list";
import { Label } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";

/** What is being dragged. Kept here because the drop target has to know before the drop happens —
 *  `dataTransfer` only hands its contents over on drop, and a row must light up on the way past. */
type Dragged = { kind: "note" | "folder"; id: string };

/** A row that has turned into a text field: a new folder being named, or an old one being renamed. */
type Draft = { mode: "create"; parentId: string | null } | { mode: "rename"; folder: Folder };

/**
 * The navigation pane: where notes can be, and the notes that are there.
 *
 * The tree and the list are one component because a drag crosses between them — a note leaves a row
 * in the list and lands on a row in the tree, and the row it is heading for has to light up while
 * it is still in the air. Splitting them would mean lifting that one piece of state to the page and
 * handing it back down to both.
 */
export function Explorer({
  folders,
  selectedFolderId,
  onSelectFolder,
  onOpenInbox,
  inboxCount,
  countOf,
  expanded,
  onToggleExpanded,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onMoveNote,
  notes,
  loading,
  failed,
  selectedNoteId,
  onSelectNote,
  onPreviewNote,
}: {
  folders: Folder[];
  /** `undefined` means no folder is filtering the list — every note is shown. */
  selectedFolderId: string | undefined;
  onSelectFolder: (folderId: string | undefined) => void;
  onOpenInbox: () => void;
  inboxCount: number;
  /** How many notes are in a folder, its subfolders excluded — the folder's own contents. */
  countOf: (folderId: string) => number;
  expanded: ReadonlySet<string>;
  onToggleExpanded: (folderId: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveFolder: (folderId: string, parentId: string | null) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  /** Already filtered by the page to whatever the tree has selected. */
  notes: Note[];
  loading: boolean;
  failed: boolean;
  selectedNoteId: string | null;
  onSelectNote: (noteId: string, from: HTMLElement) => void;
  onPreviewNote: (noteId: string | null) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dragged, setDragged] = useState<Dragged | null>(null);
  /** The row the pointer is currently over, `"inbox"` for the Inbox and `null` for nothing. */
  const [over, setOver] = useState<string | null>(null);

  const tree = buildTree(folders);
  const rows = flattenTree(tree, expanded);

  /** A folder may not be dropped into itself or anything inside it, or the tree loses its root. */
  function accepts(targetId: string | null): boolean {
    if (!dragged) return false;
    if (dragged.kind === "note") return true;
    if (targetId === null) return true;
    return !subtreeIds(folders, dragged.id).has(targetId);
  }

  function drop(targetId: string | null) {
    if (!dragged || !accepts(targetId)) return;
    if (dragged.kind === "note") onMoveNote(dragged.id, targetId);
    else if (dragged.id !== targetId) onMoveFolder(dragged.id, targetId);
    setDragged(null);
    setOver(null);
  }

  function submitDraft(name: string) {
    const trimmed = name.trim();
    if (draft && trimmed.length > 0) {
      if (draft.mode === "create") onCreateFolder(trimmed, draft.parentId);
      else if (trimmed !== draft.folder.name) onRenameFolder(draft.folder.id, trimmed);
    }
    setDraft(null);
  }

  const creatingAtRoot = draft?.mode === "create" && draft.parentId === null;

  const selected = folders.find((folder) => folder.id === selectedFolderId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-1 border-b px-2 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2 px-2 pb-1">
          <Label>Places</Label>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="New folder"
            onClick={() => setDraft({ mode: "create", parentId: null })}
            className="text-muted-foreground"
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>

        <ul>
          {/* The Inbox is not a folder — it is the absence of one — but it is the first place a reader
            looks and the first place a note can be dragged, so it sits at the top of the tree. */}
          <li>
            <Row
              label="Inbox"
              icon={<Inbox aria-hidden="true" className="size-3.5 shrink-0" />}
              depth={0}
              count={inboxCount}
              selected={false}
              droppable={accepts(null)}
              over={over === "inbox"}
              onSelect={onOpenInbox}
              onDragOver={() => setOver("inbox")}
              onDragLeave={() => setOver((current) => (current === "inbox" ? null : current))}
              onDrop={() => drop(null)}
            />
          </li>

          {rows.map((node) => (
            <FolderRow
              key={node.folder.id}
              node={node}
              expanded={expanded.has(node.folder.id)}
              selected={selectedFolderId === node.folder.id}
              count={countOf(node.folder.id)}
              draft={draft}
              dragged={dragged}
              over={over === node.folder.id}
              droppable={accepts(node.folder.id)}
              onSelect={() => onSelectFolder(node.folder.id)}
              onToggle={() => onToggleExpanded(node.folder.id)}
              onDraft={setDraft}
              onSubmitDraft={submitDraft}
              onCancelDraft={() => setDraft(null)}
              onDelete={() => onDeleteFolder(node.folder.id)}
              onDragStart={() => setDragged({ kind: "folder", id: node.folder.id })}
              onDragEnd={() => {
                setDragged(null);
                setOver(null);
              }}
              onDragOver={() => setOver(node.folder.id)}
              onDragLeave={() =>
                setOver((current) => (current === node.folder.id ? null : current))
              }
              onDrop={() => drop(node.folder.id)}
            />
          ))}

          {creatingAtRoot ? (
            <li>
              <NameField depth={0} onSubmit={submitDraft} onCancel={() => setDraft(null)} />
            </li>
          ) : null}
        </ul>

        {folders.length === 0 && !creatingAtRoot ? (
          <p className="px-2 py-1 text-muted-foreground text-xs leading-5">
            No folders yet. Everything you write waits in the Inbox until you make one.
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => onSelectFolder(undefined)}
          aria-current={selectedFolderId === undefined ? "true" : undefined}
          className={`mt-1 rounded-md px-2 py-1 text-start text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring ${
            selectedFolderId === undefined
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All notes
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <NoteList
          title={selected ? selected.name : "All notes"}
          notes={notes}
          folders={folders}
          loading={loading}
          failed={failed}
          selectedId={selectedNoteId}
          onSelect={onSelectNote}
          onPreview={onPreviewNote}
          onDrag={(noteId) => setDragged(noteId === null ? null : { kind: "note", id: noteId })}
          onMove={onMoveNote}
        />
      </div>
    </div>
  );
}

function FolderRow({
  node,
  expanded,
  selected,
  count,
  draft,
  dragged,
  over,
  droppable,
  onSelect,
  onToggle,
  onDraft,
  onSubmitDraft,
  onCancelDraft,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  node: FolderNode;
  expanded: boolean;
  selected: boolean;
  count: number;
  draft: Draft | null;
  dragged: Dragged | null;
  over: boolean;
  droppable: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDraft: (draft: Draft) => void;
  onSubmitDraft: (name: string) => void;
  onCancelDraft: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  const { folder, depth, children } = node;
  const renaming = draft?.mode === "rename" && draft.folder.id === folder.id;
  const creatingHere = draft?.mode === "create" && draft.parentId === folder.id;
  const actions = folderActions(folder, onDraft, onDelete);

  if (renaming) {
    return (
      <li>
        <NameField
          depth={depth}
          initial={folder.name}
          onSubmit={onSubmitDraft}
          onCancel={onCancelDraft}
        />
      </li>
    );
  }

  return (
    <li>
      <ContextMenu>
        <ContextMenuTrigger render={<div />}>
          <div
            className={`group flex items-center rounded-md transition-colors duration-150 ${
              over && droppable ? "bg-brand-bright/15 ring-1 ring-brand-bright/40" : ""
            } ${dragged?.kind === "folder" && dragged.id === folder.id ? "opacity-40" : ""}`}
            style={{ paddingInlineStart: `${depth * 12}px` }}
          >
            <button
              type="button"
              aria-label={expanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
              aria-expanded={expanded}
              onClick={onToggle}
              // Kept for every folder, empty or not: rows that lose their chevron shift their
              // labels sideways as notes arrive, and the tree flickers as you file into it.
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight
                aria-hidden="true"
                className={`size-3 transition-transform duration-150 ease-[var(--ease-out-quart)] ${
                  expanded ? "rotate-90" : ""
                } ${children.length === 0 ? "opacity-0" : ""}`}
              />
            </button>

            <button
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", folder.name);
                onDragStart();
              }}
              onDragEnd={onDragEnd}
              // The label is the drop target as well as the handle: it is the widest part of the
              // row, and a reader aiming at a folder is aiming at its name.
              onDragOver={(event) => {
                if (!droppable) return;
                event.preventDefault();
                onDragOver();
              }}
              onDragLeave={onDragLeave}
              onDrop={(event) => {
                event.preventDefault();
                onDrop();
              }}
              onClick={onSelect}
              aria-current={selected ? "page" : undefined}
              title={folder.name}
              className={`flex min-w-0 flex-1 items-baseline gap-2 rounded-md py-1.5 pe-1 ps-1 text-start text-sm outline-none transition-[background-color,color,transform] duration-150 ease-[var(--ease-out-quart)] active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-ring ${
                selected
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{folder.name}</span>
              {count > 0 ? (
                <span className="shrink-0 font-mono text-[0.625rem] text-muted-foreground/80 tabular-nums">
                  {count}
                </span>
              ) : null}
            </button>

            <Menu>
              <MenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${folder.name}`}
                    // Hidden until wanted, but never hidden from the keyboard.
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  />
                }
              >
                <MoreHorizontal aria-hidden="true" />
              </MenuTrigger>
              <MenuPopup align="start" className="max-w-60">
                {actions.map((action) => (
                  <span key={action.label}>
                    {action.destructive ? <MenuSeparator /> : null}
                    <MenuItem
                      closeOnClick
                      onClick={action.run}
                      variant={action.destructive ? "destructive" : "default"}
                    >
                      <action.icon aria-hidden="true" />
                      {action.label}
                    </MenuItem>
                  </span>
                ))}
                <FolderNote />
              </MenuPopup>
            </Menu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuPopup align="start" className="max-w-60">
          {actions.map((action) => (
            <span key={action.label}>
              {action.destructive ? <ContextMenuSeparator /> : null}
              <ContextMenuItem
                closeOnClick
                onClick={action.run}
                variant={action.destructive ? "destructive" : "default"}
              >
                <action.icon aria-hidden="true" />
                {action.label}
              </ContextMenuItem>
            </span>
          ))}
          <FolderNote />
        </ContextMenuPopup>
      </ContextMenu>

      {creatingHere ? (
        <NameField depth={depth + 1} onSubmit={onSubmitDraft} onCancel={onCancelDraft} />
      ) : null}
    </li>
  );
}

/**
 * The same three actions, offered from the row's own menu and from a right-click. One list, because
 * they mean the same thing — a reader should never have to learn which of the two knows how to
 * rename.
 */
type FolderAction = { label: string; icon: LucideIcon; run: () => void; destructive?: boolean };

function folderActions(
  folder: Folder,
  onDraft: (draft: Draft) => void,
  onDelete: () => void,
): FolderAction[] {
  return [
    {
      label: "New folder inside",
      icon: FolderPlus,
      run: () => onDraft({ mode: "create", parentId: folder.id }),
    },
    { label: "Rename", icon: Pencil, run: () => onDraft({ mode: "rename", folder }) },
    { label: "Delete folder", icon: Trash2, run: onDelete, destructive: true },
  ];
}

/** Said where the decision is made, because deleting a folder sounds like deleting what is in it. */
function FolderNote() {
  return (
    <p className="px-2 py-1.5 text-muted-foreground text-xs leading-5">
      Deleting a folder keeps its notes. They go back to the Inbox.
    </p>
  );
}

/** A row that is a text field for as long as it takes to name something. Enter keeps, Escape drops. */
function NameField({
  depth,
  initial = "",
  onSubmit,
  onCancel,
}: {
  depth: number;
  initial?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  // Focused and selected on mount, the same way the composer takes the cursor: naming something is
  // the only reason this row exists, so the reader should already be typing into it.
  const focus = (element: HTMLInputElement | null) => {
    element?.focus();
    element?.select();
  };

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit(event.currentTarget.value);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="py-0.5" style={{ paddingInlineStart: `${depth * 12 + 20}px` }}>
      <input
        ref={focus}
        defaultValue={initial}
        aria-label="Folder name"
        placeholder="Folder name"
        maxLength={200}
        onKeyDown={onKeyDown}
        // Clicking elsewhere keeps what was typed rather than throwing it away: the reader moved on,
        // they did not change their mind, and Escape is there for when they did.
        onBlur={(event) => onSubmit(event.currentTarget.value)}
        className="w-full rounded-md border border-ring bg-card px-2 py-1 text-sm outline-none"
      />
    </div>
  );
}

/** The Inbox: a place notes can be, drawn like a folder without being one. */
function Row({
  label,
  icon,
  depth,
  count,
  selected,
  droppable,
  over,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  label: string;
  icon: ReactNode;
  depth: number;
  count: number;
  selected: boolean;
  droppable: boolean;
  over: boolean;
  onSelect: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "page" : undefined}
      onDragOver={(event) => {
        if (!droppable) return;
        event.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      style={{ paddingInlineStart: `${depth * 12 + 8}px` }}
      className={`flex w-full items-center gap-2 rounded-md py-1.5 pe-2 text-start text-sm outline-none transition-[background-color,color,transform] duration-150 ease-[var(--ease-out-quart)] active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-ring ${
        over && droppable ? "bg-brand-bright/15 ring-1 ring-brand-bright/40" : ""
      } ${
        selected
          ? "bg-sidebar-accent text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count > 0 ? (
        <span className="shrink-0 font-mono text-[0.625rem] text-muted-foreground/80 tabular-nums">
          {count}
        </span>
      ) : null}
    </button>
  );
}
