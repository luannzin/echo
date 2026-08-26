"use client";

import { buildTree, flattenTree, subtreeIds } from "@echo/core";
import type { Category, Folder, Note } from "@echo/types";
import { Inbox, Layers, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryList } from "@/modules/explorer/_components/category-list";
import { FolderNameField } from "@/modules/explorer/_components/folder-name-field";
import { FolderRow } from "@/modules/explorer/_components/folder-row";
import { PlaceRow } from "@/modules/explorer/_components/place-row";
import type { Draft, Dragged } from "@/modules/explorer/model";
import { NoteList } from "@/modules/notes/_components/note-list";
import { Label } from "@/shared/_components/label";

/** The Inbox has no folder id of its own; `null` is what a note carries when it is not filed. */
const INBOX = "inbox";

/**
 * The navigation pane: where notes can be, and the notes that are there.
 *
 * The tree and the list are one component because a drag crosses between them — a note leaves a row
 * in the list and lands on a row in the tree, and the row it is heading for has to light up while it
 * is still in the air.
 */
export const Explorer = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onOpenInbox,
  atInbox,
  inboxCount,
  allCount,
  countOf,
  expanded,
  onToggleExpanded,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onMoveNote,
  categories,
  categoryCountOf,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
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
  /** Whether the workspace is showing the Inbox, so the row that leads there can say so. */
  atInbox: boolean;
  inboxCount: number;
  /** Every note there is, filed or not — what "All notes" is offering. */
  allCount: number;
  /** How many notes are in a folder, its subfolders excluded. */
  countOf: (folderId: string) => number;
  expanded: ReadonlySet<string>;
  onToggleExpanded: (folderId: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveFolder: (folderId: string, parentId: string | null) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  categories: Category[];
  categoryCountOf: (categoryId: string) => number;
  /** `undefined` means the list is not being narrowed to one label. */
  selectedCategoryId: string | undefined;
  onSelectCategory: (categoryId: string | undefined) => void;
  onCreateCategory: (name: string) => void;
  onRenameCategory: (categoryId: string, name: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  /** Already filtered by the page to whatever the tree has selected. */
  notes: Note[];
  loading: boolean;
  failed: boolean;
  selectedNoteId: string | null;
  onSelectNote: (noteId: string, from: HTMLElement) => void;
  onPreviewNote: (noteId: string | null) => void;
}) => {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dragged, setDragged] = useState<Dragged | null>(null);
  /** The row the pointer is over, `INBOX` for the Inbox and `null` for nothing. */
  const [over, setOver] = useState<string | null>(null);

  const rows = flattenTree(buildTree(folders), expanded);
  const selected = folders.find((folder) => folder.id === selectedFolderId);
  /** The list says what it is showing, whichever of the two questions narrowed it. */
  const listTitle =
    categories?.find((category) => category.id === selectedCategoryId)?.name ??
    selected?.name ??
    "All notes";
  const creatingAtRoot = draft?.mode === "create" && draft.parentId === null;

  /** A folder may not be dropped into itself or anything inside it, or the tree loses its root. */
  const accepts = (targetId: string | null): boolean => {
    if (!dragged) return false;
    if (dragged.kind === "note") return true;
    if (targetId === null) return true;
    return !subtreeIds(folders, dragged.id).has(targetId);
  };

  const drop = (targetId: string | null) => {
    if (!dragged || !accepts(targetId)) return;
    if (dragged.kind === "note") onMoveNote(dragged.id, targetId);
    else if (dragged.id !== targetId) onMoveFolder(dragged.id, targetId);
    setDragged(null);
    setOver(null);
  };

  const leave = (id: string) => () => setOver((current) => (current === id ? null : current));

  const submitDraft = (name: string) => {
    const trimmed = name.trim();
    if (draft && trimmed.length > 0) {
      if (draft.mode === "create") onCreateFolder(trimmed, draft.parentId);
      else if (trimmed !== draft.folder.name) onRenameFolder(draft.folder.id, trimmed);
    }
    setDraft(null);
  };

  const cancelDraft = () => setDraft(null);
  const dragNote = (noteId: string | null) =>
    setDragged(noteId === null ? null : { kind: "note", id: noteId });

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
          {/* The Inbox is not a folder — it is the absence of one — but it is the first place a
              reader looks and the first place a note can be dragged. */}
          <li>
            <PlaceRow
              label="Inbox"
              icon={Inbox}
              count={inboxCount}
              selected={atInbox}
              droppable={accepts(null)}
              over={over === INBOX}
              onSelect={onOpenInbox}
              onDragOver={() => setOver(INBOX)}
              onDragLeave={leave(INBOX)}
              onDrop={() => drop(null)}
            />
          </li>

          {/* What the list shows, above the folders that narrow it. It was a small link under the
              tree, which made the one row that is always available the hardest one to find. */}
          <li>
            <PlaceRow
              label="All notes"
              icon={Layers}
              count={allCount}
              selected={
                !atInbox && selectedFolderId === undefined && selectedCategoryId === undefined
              }
              onSelect={() => onSelectFolder(undefined)}
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
              onCancelDraft={cancelDraft}
              onDelete={() => onDeleteFolder(node.folder.id)}
              onDragStart={() => setDragged({ kind: "folder", id: node.folder.id })}
              onDragEnd={() => {
                setDragged(null);
                setOver(null);
              }}
              onDragOver={() => setOver(node.folder.id)}
              onDragLeave={leave(node.folder.id)}
              onDrop={() => drop(node.folder.id)}
            />
          ))}

          {creatingAtRoot ? (
            <li>
              <FolderNameField depth={0} onSubmit={submitDraft} onCancel={cancelDraft} />
            </li>
          ) : null}
        </ul>

        {folders.length === 0 && !creatingAtRoot ? (
          <p className="px-2 py-1 text-muted-foreground text-xs leading-5">
            No folders yet. Everything you write waits in the Inbox until you make one.
          </p>
        ) : null}
      </div>

      {/* Bounded on purpose: a reader with forty labels still has to be able to reach their notes,
          and the list below is what the pane is for. */}
      <div className="max-h-56 shrink-0 overflow-y-auto border-b">
        <CategoryList
          categories={categories}
          countOf={categoryCountOf}
          selectedId={selectedCategoryId}
          onSelect={onSelectCategory}
          onCreate={onCreateCategory}
          onRename={onRenameCategory}
          onDelete={onDeleteCategory}
        />
      </div>

      <div className="min-h-0 flex-1">
        <NoteList
          title={listTitle}
          notes={notes}
          folders={folders}
          loading={loading}
          failed={failed}
          selectedId={selectedNoteId}
          onSelect={onSelectNote}
          onPreview={onPreviewNote}
          onDrag={dragNote}
          onMove={onMoveNote}
        />
      </div>
    </div>
  );
};
