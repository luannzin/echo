"use client";

/**
 * The model, arriving. A wait this long has to be legible or it reads as a broken panel — a hairline
 * rather than a bar, because this is a background errand, not a task the reader is performing.
 */
export const ModelProgress = ({ progress }: { progress: number }) => {
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
        {/* Scaled rather than resized: a download reports progress many times a second and `width`
            would put every report through layout. Linear, or it would look like it was speeding up
            and slowing down. */}
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
};
