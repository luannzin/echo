import { Engraving } from "@/components/engraving";
import { InstallBox } from "@/components/install-box";

const requirements = [
  ["Bun 1.3 or newer", "That is the entire list for the web app."],
  ["No .env, no key, no server", "Nothing to provision and nothing to sign into."],
  [
    "One download, once",
    "The multilingual model is about 120 MB and arrives the first time you search by meaning. Writing, filing and word search work before it lands.",
  ],
];

export const RunIt = () => (
  <section id="install" className="scroll-mt-24 py-16 md:py-24">
    <div className="shell grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
      <div className="reveal min-w-0">
        <h2 className="display text-[clamp(2rem,3.6vw,3.4rem)]">Three commands and it is yours</h2>
        <p className="prose-body mt-5 text-ink/85">
          Real Postgres, compiled to WebAssembly, running in your tab and stored in your browser.
          There is no server to point it at and no account behind it, which is why the whole setup
          is a clone, an install and a dev server.
        </p>

        <dl className="mt-8 border-t rule-ink">
          {requirements.map(([term, detail]) => (
            <div key={term} className="border-b rule-ink py-4">
              <dt className="label text-ink">{term}</dt>
              <dd className="prose-body mt-1.5 text-ink/85">{detail}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8">
          <InstallBox />
        </div>
      </div>

      {/*
       * The plate, not a picture of a terminal. The commands are already on the left, in a box that
       * copies them; drawing them a second time as a window that types itself was the same three
       * lines twice. This is ground: an engraved orb on the field, screened through the same dither
       * every other plate on the page is printed with, and drifting on its own travel through the
       * viewport.
       */}
      <div className="relative min-w-0">
        <Engraving
          plate="orb"
          className="parallax ms-auto aspect-square w-full max-w-[34rem] opacity-30 [mask-image:radial-gradient(closest-side,black_58%,transparent)]"
          style={{ "--parallax": "5%", "--parallax-scale": "1.06" } as React.CSSProperties}
        />
      </div>
    </div>
  </section>
);
