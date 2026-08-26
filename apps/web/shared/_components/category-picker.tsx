"use client";

import { normalizeCategoryName } from "@echo/core";
import type { Category } from "@echo/types";
import { Plus, Tag } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { row } from "@/shared/lib/styles";

/**
 * Adding a label to a note. One field: it narrows what is already there as you type, and the last
 * row makes what you typed — so naming a new category and using it are the same gesture rather than
 * a trip to a settings screen and back.
 */
export const CategoryPicker = ({
  categories,
  used,
  onChoose,
  onCreate,
}: {
  categories: readonly Category[];
  /** Ids already on the note, which are not offered again. */
  used: ReadonlySet<string>;
  onChoose: (categoryId: string) => void;
  /** Given a name that does not exist yet. The service is idempotent on the name either way. */
  onCreate: (name: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const typed = normalizeCategoryName(query);
  const folded = typed.toLowerCase();
  const offered = categories.filter(
    (category) =>
      !used.has(category.id) &&
      (folded.length === 0 || category.name.toLowerCase().includes(folded)),
  );
  const exists = categories.some((category) => category.name.toLowerCase() === folded);
  const creatable = typed.length > 0 && !exists;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (categoryId: string) => {
    onChoose(categoryId);
    close();
  };

  const create = () => {
    if (!creatable) return;
    onCreate(typed);
    close();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Badge
            render={<button type="button" />}
            variant="outline"
            aria-label="Add a category"
            className="gap-1 border-dashed font-normal text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground"
          />
        }
      >
        <Plus aria-hidden="true" className="size-3" />
        Category
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-64 p-1">
        <input
          // Naming something is the only reason this opened, so the cursor starts in the field.
          ref={(element) => element?.focus()}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const [first] = offered;
              if (creatable) create();
              else if (first) choose(first.id);
            }
          }}
          aria-label="Find or name a category"
          placeholder="Find or name one…"
          maxLength={60}
          className="mb-1 w-full rounded-md bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />

        <ul className="max-h-56 overflow-y-auto">
          {offered.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => choose(category.id)}
                className={`${row} w-full gap-2 px-2 text-muted-foreground hover:bg-accent hover:text-foreground`}
              >
                <Tag aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{category.name}</span>
              </button>
            </li>
          ))}
          {creatable ? (
            <li>
              <button
                type="button"
                onClick={create}
                className={`${row} w-full gap-2 px-2 text-muted-foreground hover:bg-accent hover:text-foreground`}
              >
                <Plus aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">Create “{typed}”</span>
              </button>
            </li>
          ) : null}
        </ul>

        {offered.length === 0 && !creatable ? (
          <p className="px-2 py-1.5 text-muted-foreground text-xs leading-5">
            {categories.length === 0
              ? "No categories yet. Type a name to make the first one."
              : "This note already has every category you have made."}
          </p>
        ) : null}
      </PopoverPopup>
    </Popover>
  );
};
