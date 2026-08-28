"use client";

import type { Category } from "@echo/types";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FolderNameField } from "@/modules/explorer/_components/folder-name-field";
import { Count } from "@/shared/_components/count";
import { Label } from "@/shared/_components/label";
import { MenuNote } from "@/shared/_components/menu-note";
import { copy } from "@/shared/lib/i18n";
import { row } from "@/shared/lib/styles";

/**
 * What notes are about, as opposed to where they live. A category goes on any note and a note takes
 * as many as it needs, which is the whole reason this is a flat list beside the tree rather than a
 * second tree — nesting a label would only ask the reader to file it somewhere too.
 */
export const CategoryList = ({
  categories,
  countOf,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  categories: readonly Category[];
  countOf: (categoryId: string) => number;
  /** `undefined` when the list is not being narrowed by a category. */
  selectedId: string | undefined;
  onSelect: (categoryId: string | undefined) => void;
  onCreate: (name: string) => void;
  onRename: (categoryId: string, name: string) => void;
  onDelete: (categoryId: string) => void;
}) => {
  /** The row that has turned into a text field: a new category, or one being renamed. */
  const [naming, setNaming] = useState<{ id: string } | "new" | null>(null);
  const words = copy().explorer;

  const submit = (name: string) => {
    const trimmed = name.trim();
    if (naming && trimmed.length > 0) {
      if (naming === "new") onCreate(trimmed);
      else onRename(naming.id, trimmed);
    }
    setNaming(null);
  };

  return (
    <div className="flex flex-col gap-1 px-2 pt-4 pb-3">
      <div className="flex items-center justify-between gap-2 px-2 pb-1">
        <Label>{words.categories}</Label>
        <Button
          variant="ghost"
          size="icon-sm"
          data-new="category"
          aria-label={copy().common.newCategory}
          onClick={() => setNaming("new")}
          className="text-muted-foreground"
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>

      <ul>
        {categories.map((category) =>
          naming !== null && naming !== "new" && naming.id === category.id ? (
            <li key={category.id}>
              <FolderNameField
                depth={0}
                initial={category.name}
                label={words.categoryName}
                onSubmit={submit}
                onCancel={() => setNaming(null)}
              />
            </li>
          ) : (
            <li key={category.id}>
              <ContextMenu>
                <ContextMenuTrigger
                  render={
                    <button
                      type="button"
                      // Selecting the one already selected clears it: a filter you cannot turn off
                      // from the control that turned it on is a trap.
                      onClick={() => onSelect(selectedId === category.id ? undefined : category.id)}
                      aria-pressed={selectedId === category.id}
                      className={`${row} w-full gap-2 px-2 ${
                        selectedId === category.id
                          ? "bg-sidebar-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    />
                  }
                >
                  <Tag aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-start">{category.name}</span>
                  <Count
                    of={countOf(category.id)}
                    describe={(tagged) => words.taggedCount(tagged, category.name)}
                  />
                </ContextMenuTrigger>
                <ContextMenuPopup align="start" className="max-w-64">
                  <ContextMenuItem closeOnClick onClick={() => setNaming({ id: category.id })}>
                    <Pencil aria-hidden="true" />
                    {copy().common.rename}
                  </ContextMenuItem>
                  <ContextMenuItem
                    closeOnClick
                    onClick={() => onDelete(category.id)}
                    variant="destructive"
                  >
                    <Trash2 aria-hidden="true" />
                    {words.deleteCategory}
                  </ContextMenuItem>
                  <MenuNote>{words.deleteCategoryHint}</MenuNote>
                </ContextMenuPopup>
              </ContextMenu>
            </li>
          ),
        )}

        {naming === "new" ? (
          <li>
            <FolderNameField
              depth={0}
              label={words.categoryName}
              onSubmit={submit}
              onCancel={() => setNaming(null)}
            />
          </li>
        ) : null}
      </ul>

      {categories.length === 0 && naming !== "new" ? (
        <p className="px-2 py-1 text-muted-foreground text-xs leading-5">{words.noCategories}</p>
      ) : null}
    </div>
  );
};
