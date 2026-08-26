"use client";

import type { FolderNode } from "@echo/core";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { FolderNameField } from "@/modules/explorer/_components/folder-name-field";
import { type Draft, type Dragged, folderActions } from "@/modules/explorer/model";
import { Count } from "@/shared/_components/count";
import { MenuNote } from "@/shared/_components/menu-note";
import { quiet } from "@/shared/lib/styles";

const INDENT_PX = 12;

/** Said where the decision is made, because deleting a folder sounds like deleting what is in it. */
const DELETE_NOTE = "Deleting a folder keeps its notes. They go back to the Inbox.";

export const FolderRow = ({
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
}) => {
  const { folder, depth, children } = node;
  const renaming = draft?.mode === "rename" && draft.folder.id === folder.id;
  const creatingHere = draft?.mode === "create" && draft.parentId === folder.id;
  const actions = folderActions(folder, onDraft, onDelete);

  if (renaming) {
    return (
      <li>
        <FolderNameField
          depth={depth}
          initial={folder.name}
          onSubmit={onSubmitDraft}
          onCancel={onCancelDraft}
        />
      </li>
    );
  }

  const startDrag = (event: React.DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", folder.name);
    onDragStart();
  };

  const allowDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    if (!droppable) return;
    event.preventDefault();
    onDragOver();
  };

  return (
    <li>
      <ContextMenu>
        <ContextMenuTrigger render={<div />}>
          <div
            className={`group flex items-center rounded-md transition-colors duration-150 ${
              over && droppable ? "bg-brand-bright/15 ring-1 ring-brand-bright/40" : ""
            } ${dragged?.kind === "folder" && dragged.id === folder.id ? "opacity-40" : ""}`}
            style={{ paddingInlineStart: `${depth * INDENT_PX}px` }}
          >
            {/* Kept for every folder, empty or not: rows that lose their chevron shift their labels
                sideways as notes arrive, and the tree flickers as you file into it. */}
            <button
              type="button"
              aria-label={expanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
              aria-expanded={expanded}
              onClick={onToggle}
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight
                aria-hidden="true"
                className={`size-3 transition-transform duration-150 ease-[var(--ease-out-quart)] ${
                  expanded ? "rotate-90" : ""
                } ${children.length === 0 ? "opacity-0" : ""}`}
              />
            </button>

            {/* The label is the drop target as well as the handle: it is the widest part of the row,
                and a reader aiming at a folder is aiming at its name. */}
            <button
              type="button"
              draggable
              onDragStart={startDrag}
              onDragEnd={onDragEnd}
              onDragOver={allowDrop}
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
              <Count of={count} />
            </button>

            <Menu>
              <MenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${folder.name}`}
                    className={`shrink-0 text-muted-foreground ${quiet}`}
                  />
                }
              >
                <MoreHorizontal aria-hidden="true" />
              </MenuTrigger>
              <MenuPopup align="start" className="max-w-60">
                {actions.map((action) => (
                  <div key={action.label}>
                    {action.destructive ? <MenuSeparator /> : null}
                    <MenuItem
                      closeOnClick
                      onClick={action.run}
                      variant={action.destructive ? "destructive" : "default"}
                    >
                      <action.icon aria-hidden="true" />
                      {action.label}
                    </MenuItem>
                  </div>
                ))}
                <MenuNote>{DELETE_NOTE}</MenuNote>
              </MenuPopup>
            </Menu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuPopup align="start" className="max-w-60">
          {actions.map((action) => (
            <div key={action.label}>
              {action.destructive ? <ContextMenuSeparator /> : null}
              <ContextMenuItem
                closeOnClick
                onClick={action.run}
                variant={action.destructive ? "destructive" : "default"}
              >
                <action.icon aria-hidden="true" />
                {action.label}
              </ContextMenuItem>
            </div>
          ))}
          <MenuNote>{DELETE_NOTE}</MenuNote>
        </ContextMenuPopup>
      </ContextMenu>

      {creatingHere ? (
        <FolderNameField depth={depth + 1} onSubmit={onSubmitDraft} onCancel={onCancelDraft} />
      ) : null}
    </li>
  );
};
