import { Panel } from "@/components/panel";

/**
 * The palette taking a question apart.
 *
 * The mechanics are the ones S3 was verified against (the project chip, the count set aside, the
 * framing words removed and then admitted to) over a corpus of ordinary working notes rather than
 * the author's own. Shapes and counts come from a real run; the note titles are the illustration.
 */
const QUERY = "notes about caching in payments";

const cue = (from: number, to: number) =>
  ({ "--cue-from": `${from}%`, "--cue-to": `${to}%` }) as React.CSSProperties;

const results = [
  {
    before: "Why the ",
    mark: "caching",
    after: " layer misses on a cold start",
    where: "Payments",
    when: "2d",
  },
  {
    before: "Redis ",
    mark: "caching",
    after: " for the invoice PDF renderer",
    where: "Payments",
    when: "3w",
  },
];

export const SearchDemo = () => (
  <Panel name="Search" state="⌘K" className="w-full">
    {/* The question, as typed. */}
    <div className="flex items-baseline gap-3 border-b rule-carbon px-5 py-4">
      <span className="font-mono text-[0.8rem] text-brand-lit">›</span>
      <p
        className="cue-keys min-w-0 font-sans text-[0.95rem] text-quiet md:text-[1.05rem]"
        style={{ ...cue(4, 30), "--keys": QUERY.length } as React.CSSProperties}
      >
        {QUERY}
      </p>
    </div>

    <div className="space-y-4 px-5 py-5">
      {/* What it decided the question was made of. Each filter is one press from gone. */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="cue inline-flex items-center gap-2 rounded-full border border-brand-lit/45 bg-brand-lit/10 px-3 py-1 font-mono text-[0.6875rem] tracking-[0.08em] text-quiet"
          style={cue(32, 42)}
        >
          Project · Payments
          <span aria-hidden="true" className="text-faint">
            ×
          </span>
        </span>
        <span
          className="cue font-mono text-[0.6875rem] tracking-[0.08em] text-faint"
          style={cue(36, 46)}
        >
          16 set aside
        </span>
      </div>

      <p
        className="cue font-mono text-[0.6875rem] tracking-[0.08em] text-faint"
        style={cue(40, 50)}
      >
        Left out as framing:{" "}
        <span className="text-quiet/70 line-through decoration-faint">notes about</span>
      </p>

      {/* The answers, with the word that matched marked in the line it appears on. */}
      <ul className="divide-y divide-[color-mix(in_oklab,var(--color-quiet)_12%,transparent)] border-t rule-carbon">
        {results.map((result, index) => (
          <li
            key={result.before}
            className="cue flex items-baseline gap-3 py-3"
            style={cue(46 + index * 6, 58 + index * 6)}
          >
            <p className="min-w-0 flex-1 truncate text-[0.9rem] text-quiet">
              {result.before}
              <mark className="bg-brand-lit/25 text-ink">{result.mark}</mark>
              {result.after}
            </p>
            <p className="label shrink-0 text-faint">{result.where}</p>
            <p className="label shrink-0 text-faint">{result.when}</p>
          </li>
        ))}
      </ul>
    </div>
  </Panel>
);
