"use client";

import { copy } from "@/shared/lib/i18n";

/**
 * The model, arriving. A wait this long has to be legible or it reads as a broken panel — a hairline
 * rather than a bar, because this is a background errand, not a task the reader is performing.
 */
/**
 * `progress` is absent where the runtime cannot measure itself — the desktop hands the download to
 * the model library and is told only when it is done. The wait is still real and still worth
 * showing, so it is drawn as a bar that is busy rather than one that is anywhere in particular.
 */
export const ModelProgress = ({ progress }: { progress?: number }) => {
  const percent = progress === undefined ? undefined : Math.round(progress * 100);

  return (
    <div className="space-y-2.5 pt-1">
      <p
        role="status"
        aria-live="polite"
        className="flex items-baseline justify-between gap-3 text-muted-foreground text-sm"
      >
        {copy().intelligence.learningToRead}
        {percent !== undefined && (
          <span className="font-mono text-[0.6875rem] tabular-nums">{percent}%</span>
        )}
      </p>
      <div
        role="progressbar"
        aria-label={copy().intelligence.downloadingModel}
        // An indeterminate progressbar is one with no `aria-valuenow`, which is exactly the case
        // here — omitted rather than zeroed, so it is announced as busy and not as stalled.
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-px w-full overflow-hidden bg-border"
      >
        {/* Scaled rather than resized: a download reports progress many times a second and `width`
            would put every report through layout. Linear, or it would look like it was speeding up
            and slowing down. */}
        <div
          className={
            percent === undefined
              ? "h-full w-full animate-pulse bg-brand-bright"
              : "h-full origin-left bg-brand-bright transition-transform duration-500 ease-linear"
          }
          style={
            percent === undefined
              ? undefined
              : { transform: `scaleX(${Math.max(0.02, progress ?? 0)})` }
          }
        />
      </div>
      <p className="text-xs leading-5">{copy().intelligence.modelDownloadsOnce}</p>
    </div>
  );
};
