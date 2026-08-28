import { type ReactNode, useId } from "react";
import { Label } from "@/shared/_components/label";

/**
 * One block of settings: a heading, an optional sentence about what the block is for, and the rows.
 *
 * The heading is a real `h2` inside a labelled `section`, so a screen reader can walk this page by
 * its parts rather than reading forty controls in a row.
 */
export const Section = ({
  title,
  note,
  children,
}: {
  title: string;
  /** What the block is for, where that is not obvious from the controls under it. */
  note?: string;
  children: ReactNode;
}) => {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="border-border/60 border-t py-6 first:border-t-0"
    >
      <h2 id={headingId} className="pb-1">
        <Label>{title}</Label>
      </h2>
      {note ? <p className="pb-3 text-muted-foreground text-sm leading-relaxed">{note}</p> : null}
      {children}
    </section>
  );
};
