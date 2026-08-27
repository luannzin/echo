import type { ReactNode } from "react";

/**
 * The frame every demo on this page is drawn inside.
 *
 * The demos are the application, not a picture of one: real markup in the app's own carbon, at the
 * app's own hairline weight, so they stay sharp at any density, repaint with the tokens and cost
 * kilobytes rather than a screenshot folder. The title strip is the app's quiet chrome: a name on
 * the left, the state on the right, nothing else.
 */
export const Panel = ({
  name,
  state,
  children,
  className,
}: {
  name: string;
  state?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={`panel ${className ?? ""}`}>
    <div className="flex items-center justify-between border-b rule-carbon bg-carbon-lift px-4 py-2.5">
      <p className="label text-faint">{name}</p>
      {state ? <p className="label text-faint">{state}</p> : null}
    </div>
    {children}
  </div>
);
