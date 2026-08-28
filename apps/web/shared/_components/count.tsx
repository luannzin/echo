import { numeric } from "@/shared/lib/styles";

/**
 * How many things are in a place. Nothing is drawn for none.
 *
 * The number is the whole visible control; the sentence exists for a screen reader, which is
 * exactly where "1 notes tagged Work" would be read out loud. `describe` takes the count and
 * returns the finished sentence, so the plural and the word order both belong to the language
 * rather than to this component pasting a noun onto a number.
 */
export const Count = ({ of, describe }: { of: number; describe?: (count: number) => string }) =>
  of > 0 ? (
    <span className={`shrink-0 text-[0.625rem] text-muted-foreground/80 ${numeric}`}>
      {of}
      {describe ? <span className="sr-only"> {describe(of)}</span> : null}
    </span>
  ) : null;
