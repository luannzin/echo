"use client";

import type { KeyboardEvent } from "react";

const INDENT_PX = 12;
const GUTTER_PX = 20;

/** A row that is a text field for as long as it takes to name something. */
export const FolderNameField = ({
  depth,
  initial = "",
  onSubmit,
  onCancel,
}: {
  depth: number;
  initial?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) => {
  // Focused and selected on mount, the same way the composer takes the cursor: naming something is
  // the only reason this row exists.
  const takeCursor = (element: HTMLInputElement | null) => {
    element?.focus();
    element?.select();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit(event.currentTarget.value);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="py-0.5" style={{ paddingInlineStart: `${depth * INDENT_PX + GUTTER_PX}px` }}>
      <input
        ref={takeCursor}
        defaultValue={initial}
        aria-label="Folder name"
        placeholder="Folder name"
        maxLength={200}
        onKeyDown={onKeyDown}
        // Clicking away keeps what was typed: the reader moved on, they did not change their mind,
        // and Escape is there for when they did.
        onBlur={(event) => onSubmit(event.currentTarget.value)}
        className="w-full rounded-md border border-ring bg-card px-2 py-1 text-sm outline-none"
      />
    </div>
  );
};
