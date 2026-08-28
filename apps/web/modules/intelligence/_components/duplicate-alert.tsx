"use client";

import { CopyCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Related } from "@/modules/intelligence/related";
import { copy } from "@/shared/lib/i18n";

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
    <AlertTitle>{copy().intelligence.writtenBefore}</AlertTitle>
    <AlertDescription>
      <p className="line-clamp-2 text-xs leading-5">
        {duplicate.note.title || copy().common.untitled}
      </p>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={(event) => onOpen(duplicate.note.id, event.currentTarget)}
        >
          {copy().intelligence.openIt}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDismiss(duplicate.note.id)}>
          {copy().intelligence.notTheSame}
        </Button>
      </div>
    </AlertDescription>
  </Alert>
);
