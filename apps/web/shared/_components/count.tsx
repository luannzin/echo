import { numeric } from "@/shared/lib/styles";

/** How many things are in a place. Nothing is drawn for none. */
export const Count = ({ of, label }: { of: number; label?: string }) =>
  of > 0 ? (
    <span className={`shrink-0 text-[0.625rem] text-muted-foreground/80 ${numeric}`}>
      {of}
      {label ? <span className="sr-only"> {label}</span> : null}
    </span>
  ) : null;
