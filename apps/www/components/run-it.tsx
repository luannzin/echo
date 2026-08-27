import { InstallBox } from "@/components/install-box";
import { TerminalDemo } from "@/components/terminal-demo";

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

      <div className="min-w-0">
        <TerminalDemo />
      </div>
    </div>
  </section>
);
