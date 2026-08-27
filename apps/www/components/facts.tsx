import { Engraving } from "@/components/engraving";

const lead = {
  title: "Search keeps up with typing",
  body: "Full text is a GIN index over a stored tsvector, not a scan. Ten thousand notes answer a query in 21 ms, and related notes in 8 ms. Meaning arrives a moment behind the words and re-orders the answers rather than holding them up.",
  stat: "21 ms · 10,000 notes",
};

const rest = [
  {
    title: "Offline is the normal case",
    body: "Install it from the browser and after the first visit it opens with no network at all. The shell, the database and every note are already on the machine. There is no offline banner, because there is nothing to say.",
  },
  {
    title: "Forgetting is real",
    body: "Learned rules are never stored. They are worked out again from your corrections every time they are read, so deleting the correction is the only way the rule exists. “Forget this” is not a flag somebody can leave set.",
  },
  {
    title: "The desktop build is the same code",
    body: "macOS, Windows and Linux through Tauri, plus an editor mode the website never offers: your open notes along the top, a split view, and nothing else on the screen.",
  },
];

/**
 * The band where the field goes quiet.
 *
 * One tonal shift late in the page, carrying the four things a reader who has decided they are
 * interested actually wants to know. The paper bleeds the full width of the viewport and the text
 * inside it sits on the same `.shell` as every other section, so the tone changes without the
 * alignment moving. Ruled rows rather than cards: these are facts in a column, not six products to
 * choose between.
 */
export const Facts = () => (
  <section
    id="facts"
    className="relative scroll-mt-24 overflow-hidden bg-paper py-16 text-brand md:py-24"
  >
    <Engraving
      plate="spiral"
      screen="dither-paper"
      className="parallax pointer-events-none absolute -top-24 -right-24 size-[34rem] opacity-[0.18]"
      style={{ "--parallax": "6%" } as React.CSSProperties}
    />

    <div className="shell relative">
      <div className="reveal grid gap-6 border-b rule-brand pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end lg:gap-14">
        <h2 className="display text-[clamp(2.1rem,4vw,3.6rem)] text-brand">{lead.title}</h2>
        <div>
          <p className="prose-body text-brand/80">{lead.body}</p>
          <p className="label mt-4 text-brand/70">{lead.stat}</p>
        </div>
      </div>

      <div className="grid gap-x-12 gap-y-10 pt-12 lg:grid-cols-3">
        {rest.map((fact) => (
          <div key={fact.title} className="reveal border-t rule-brand pt-6">
            <h3 className="font-sans text-[1.0625rem] font-medium tracking-[-0.01em] text-brand">
              {fact.title}
            </h3>
            <p className="prose-body mt-2.5 text-brand/75">{fact.body}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
