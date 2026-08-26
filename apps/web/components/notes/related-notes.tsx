"use client";

import type { EmbedderStatus } from "@echo/embeddings";
import type { Note } from "@echo/types";
import { CopyCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalysisState } from "@/lib/echo";

export type Related = { note: Note; semantic: number };

/**
 * What echo remembers about what you are writing. Silence is a valid answer: showing weak matches
 * would teach the writer to ignore this panel.
 *
 * Silence is only ever allowed to mean "nothing matches", though. Every other reason this panel
 * could be empty — a model still downloading, notes not read yet, a model that failed — says so in
 * its own words. An empty panel that means four different things is a panel nobody trusts.
 */
export function RelatedNotes({
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
}) {
  const quiet = related.length === 0 && duplicate === null;

  if (quiet && model.state === "unavailable") {
    return (
      <p>
        Related notes need the local model, which could not be loaded. Everything else — writing,
        saving, search by words — works without it.
      </p>
    );
  }

  // The one real wait in the product, and the only place it is ever mentioned: a hundred and twenty
  // megabytes of model, fetched once and then kept by the browser forever.
  if (quiet && model.state === "loading") {
    return <Arriving progress={model.progress} />;
  }

  if (quiet && (analysis.pending > 0 || analysis.failed)) {
    return analysis.failed ? (
      <p>Reading your notes did not finish. It will pick up again on the next note you write.</p>
    ) : (
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

  if (quiet) {
    return <p>Related notes appear here once you have written something they connect to.</p>;
  }

  return (
    <div className="space-y-3">
      {duplicate ? (
        // Never merged, never rewritten: echo says what it noticed and the writer decides. Neutral
        // on purpose: blue is rationed to focus and selection, and a notice is neither.
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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismissDuplicate(duplicate.note.id)}
              >
                Not the same
              </Button>
            </div>
          </AlertDescription>
        </Alert>
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
}

/**
 * The model, arriving. A wait this long has to be legible or it reads as a broken panel, and it is
 * worth saying plainly what is being fetched and that it only happens once — the alternative is a
 * reader who assumes the feature does not work.
 *
 * A hairline rather than a bar: this is a background errand, not a task the reader is performing,
 * and the interface should weigh about as much as the errand does.
 */
function Arriving({ progress }: { progress: number }) {
  const percent = Math.round(progress * 100);
  return (
    <div className="space-y-2.5 pt-1">
      <p
        role="status"
        aria-live="polite"
        className="flex items-baseline justify-between gap-3 text-muted-foreground text-sm"
      >
        Learning to read your notes
        <span className="font-mono text-[0.6875rem] tabular-nums">{percent}%</span>
      </p>
      <div
        role="progressbar"
        aria-label="Downloading the local model"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-px w-full overflow-hidden bg-border"
      >
        {/* Scaled rather than resized: a download reports progress many times a second, and `width`
            would put every one of those reports through layout. Linear, because a progress bar is
            constant motion — an easing curve here would make the download look like it was
            speeding up and slowing down. */}
        <div
          className="h-full origin-left bg-brand-bright transition-transform duration-500 ease-linear"
          style={{ transform: `scaleX(${Math.max(0.02, progress)})` }}
        />
      </div>
      <p className="text-xs leading-5">
        The language model downloads once and then stays on this device. Writing, saving and search
        by words all work while it arrives.
      </p>
    </div>
  );
}
