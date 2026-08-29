"use client";

import type { Note } from "@echo/types";
import type { ReactNode } from "react";
import { Stream } from "@/modules/notes/_components/stream";

/**
 * The stream, with the composer docked at the foot of it.
 *
 * The composer scrolls inside the stream rather than beside it: sharing one scroll container is what
 * keeps both columns exactly the same width. `data-stream-scroll` is how the composer finds the
 * scroller it lives in, so it stays on the element that actually scrolls.
 */
export const StreamView = ({
  notes,
  labelsOf,
  arrivedId,
  previewId,
  onOpen,
  composer,
}: {
  notes: Note[];
  labelsOf: (noteId: string) => string;
  arrivedId: string | null;
  previewId: string | null;
  onOpen: (noteId: string, from?: HTMLElement) => void;
  composer: ReactNode;
}) => (
  <div
    data-stream-scroll
    className="h-full overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_20px)]"
  >
    <Stream
      notes={notes}
      labelsOf={labelsOf}
      arrivedId={arrivedId}
      previewId={previewId}
      onOpen={onOpen}
    />
    <div className="sticky bottom-0 bg-background pt-2">{composer}</div>
  </div>
);
