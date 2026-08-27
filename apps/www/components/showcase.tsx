import type { ReactNode } from "react";

/**
 * One claim and the screen that proves it.
 *
 * Three layouts rather than one, because three identical two-column rows is a grid pretending to be
 * a narrative. All three sit on the same `.shell`, so the demo panel in a stacked section starts on
 * the same edge as the heading in a two-column one: only the arrangement varies, never the measure.
 */
export const Showcase = ({
  id,
  title,
  children,
  demo,
  layout = "text-left",
}: {
  id?: string;
  title: string;
  children: ReactNode;
  demo: ReactNode;
  layout?: "text-left" | "text-right" | "stacked";
}) => {
  if (layout === "stacked") {
    return (
      <section id={id} className="scroll-mt-24 py-16 md:py-24">
        <div className="shell">
          <div className="reveal max-w-3xl">
            <h2 className="display text-[clamp(2rem,3.6vw,3.4rem)]">{title}</h2>
            <div className="prose-body mt-5 text-ink/85">{children}</div>
          </div>
          <div className="mt-12 md:mt-14">{demo}</div>
        </div>
      </section>
    );
  }

  return (
    <section id={id} className="scroll-mt-24 py-16 md:py-24">
      <div className="shell grid items-center gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-16">
        <div className={`reveal min-w-0 ${layout === "text-right" ? "lg:order-2" : ""}`}>
          <h2 className="display text-[clamp(2rem,3.6vw,3.4rem)]">{title}</h2>
          <div className="prose-body mt-5 text-ink/85">{children}</div>
        </div>
        <div className={`min-w-0 ${layout === "text-right" ? "lg:order-1" : ""}`}>{demo}</div>
      </div>
    </section>
  );
};
