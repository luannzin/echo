"use client";

import { useDeferredValue, useEffect, useMemo, useRef } from "react";
import { MarkdownBlock } from "@/modules/editor/_components/markdown-block";
import { activeBlock, blocksOf } from "@/modules/editor/markdown";
import { copy } from "@/shared/lib/i18n";

/**
 * The note as it reads, beside the note as it is written. It follows the caret rather than the
 * scrollbar: what the writer wants to see is the paragraph they are in, and that is a thing only
 * the caret knows — a pane scrolled away to read something else stays where it was put.
 *
 * Deliberately one-way. Nothing here edits: a checkbox is `readOnly` and out of the tab order,
 * because ticking a box in the preview would be echo writing into the note behind the writer's back.
 */
export const PreviewPane = ({
  markdown,
  /** The line the caret is on, counting from zero. */
  line,
}: {
  markdown: string;
  line: number;
}) => {
  const container = useRef<HTMLDivElement>(null);
  // Parsed between keystrokes rather than on each one, the way the pane beside it reads dates.
  const deferred = useDeferredValue(markdown);
  const blocks = useMemo(() => blocksOf(deferred), [deferred]);
  const active = activeBlock(blocks, line);

  useEffect(() => {
    const found = container.current?.querySelector<HTMLElement>("[data-active='true']");
    if (!found) return;
    found.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    // Only when the block under the caret changes. Every keystroke inside one paragraph would
    // otherwise drag the preview by a pixel at a time.
  }, [active]);

  return (
    <section
      aria-label={copy().editor.preview}
      ref={container}
      className="min-w-0 overflow-y-auto bg-muted/25 px-6 py-4"
    >
      {blocks.length === 0 ? (
        <p className="text-muted-foreground text-sm">{copy().editor.nothingToPreview}</p>
      ) : (
        <div className="flex flex-col gap-3 text-[17px] text-foreground/90">
          {blocks.map((block, at) => (
            <div
              key={`${block.line}:${at}`}
              data-line={block.line}
              data-active={at === active}
              // The marker is the same one the stream puts beside the row under the pointer: a bar
              // on the leading edge, outside the text, so nothing reflows when it moves. Every block
              // reserves the space, so only its colour ever changes.
              className="border-s-2 border-transparent ps-4 transition-colors duration-300 data-[active=true]:border-brand-bright"
            >
              <MarkdownBlock token={block.token} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
