"use client";

import type { EmbedderStatus } from "@echo/embeddings";
import { Skeleton } from "@/components/ui/skeleton";
import { DuplicateAlert } from "@/modules/intelligence/_components/duplicate-alert";
import { ModelProgress } from "@/modules/intelligence/_components/model-progress";
import type { Related } from "@/modules/intelligence/related";
import type { AnalysisState } from "@/shared/lib/echo";

/**
 * What echo remembers about what you are writing. Silence is a valid answer, but it is only ever
 * allowed to mean "nothing matches" — every other reason this panel could be empty says so in its
 * own words, because an empty panel that means four different things is one nobody trusts.
 */
export const RelatedNotes = ({
  related,
  duplicate,
  analysis,
  model,
  onOpen,
  onDismissDuplicate,
}: {
  related: Related[];
  /** A match close enough that it is probably the same thought, written twice. */
  duplicate: Related | null;
  /** Notes still waiting to be read, so "nothing related" may just mean "not yet". */
  analysis: AnalysisState;
  /** Where the local model is up to. It is a download before it is a runtime. */
  model: EmbedderStatus;
  onOpen: (noteId: string, from: HTMLElement) => void;
  onDismissDuplicate: (noteId: string) => void;
}) => {
  const quiet = related.length === 0 && duplicate === null;

  if (quiet && model.state === "unavailable") {
    return (
      <p>
        Related notes need the local model, which could not be loaded. Everything else — writing,
        saving, search by words — works without it.
      </p>
    );
  }

  if (quiet && model.state === "loading") return <ModelProgress progress={model.progress} />;

  if (quiet && analysis.failed) {
    return (
      <p>Reading your notes did not finish. It will pick up again on the next note you write.</p>
    );
  }

  if (quiet && analysis.pending > 0) {
    return (
      <div className="space-y-3 pt-1">
        <p role="status" className="text-muted-foreground text-sm">
          Reading your notes… {analysis.pending} to go.
        </p>
        {[80, 60].map((width) => (
          <Skeleton key={width} className="h-4" style={{ width: `${width}%` }} />
        ))}
      </div>
    );
  }

  if (quiet)
    return <p>Related notes appear here once you have written something they connect to.</p>;

  return (
    <div className="space-y-3">
      {duplicate ? (
        <DuplicateAlert duplicate={duplicate} onOpen={onOpen} onDismiss={onDismissDuplicate} />
      ) : null}

      <ul className="space-y-1">
        {related.map(({ note, semantic }) => (
          <li key={note.id}>
            <button
              type="button"
              data-note-id={note.id}
              onClick={(event) => onOpen(note.id, event.currentTarget)}
              className="w-full rounded-md px-2 py-2 text-start outline-none transition-[background-color,transform] duration-150 ease-[var(--ease-out-quart)] active:scale-[0.985] hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              <span className="flex items-baseline gap-2">
                <span className="truncate text-foreground text-sm">{note.title || "Untitled"}</span>
                <span className="ms-auto font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
                  {Math.round(semantic * 100)}%
                </span>
              </span>
              <span className="mt-0.5 line-clamp-2 text-muted-foreground text-xs leading-5">
                {note.content}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
