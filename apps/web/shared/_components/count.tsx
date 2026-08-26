import { numeric } from "@/shared/lib/styles";

/**
 * How many things are in a place. Nothing is drawn for none.
 *
 * The number is the whole visible control; the noun exists for a screen reader, which is exactly
 * where "1 notes" would be read out loud, so the plural is decided here rather than by each caller
 * pasting a word onto a number.
 */
export const Count = ({ of, label }: { of: number; label?: string }) =>
  of > 0 ? (
    <span className={`shrink-0 text-[0.625rem] text-muted-foreground/80 ${numeric}`}>
      {of}
      {label ? (
        <span className="sr-only">
          {" "}
          {of === 1 ? "note" : "notes"} {label}
        </span>
      ) : null}
    </span>
  ) : null;
