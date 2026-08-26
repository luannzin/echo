"use client";

import { CopyCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Related } from "@/modules/intelligence/related";

/**
 * Never merged, never rewritten: echo says what it noticed and the writer decides. Neutral on
 * purpose — blue is rationed to focus and selection, and a notice is neither.
 */
export const DuplicateAlert = ({
  duplicate,
  onOpen,
  onDismiss,
}: {
  duplicate: Related;
  onOpen: (noteId: string, from: HTMLElement) => void;
  onDismiss: (noteId: string) => void;
}) => (
  <Alert className="animate-settle">
    <CopyCheck aria-hidden="true" />
    <AlertTitle>You may have written this before</AlertTitle>
    <AlertDescription>
      <p className="line-clamp-2 text-xs leading-5">{duplicate.note.title || "Untitled"}</p>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={(event) => onOpen(duplicate.note.id, event.currentTarget)}
        >
          Open it
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDismiss(duplicate.note.id)}>
          Not the same
        </Button>
      </div>
    </AlertDescription>
  </Alert>
);
