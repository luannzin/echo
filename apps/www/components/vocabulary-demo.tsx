import { Panel } from "@/components/panel";

/**
 * Two of the reader's own words turning out to be one word.
 *
 * The mechanics are what S2 was verified against on a real corpus: searching one name offered the
 * other, returned notes that contain neither the letters nor the sound of the word typed, and the
 * Learned panel named the belief in a sentence with an undo beside it. The corpus here is an
 * ordinary working one: `k8s` and `kubernetes` are the same shape of pairing as the verified
 * `prod ≈ production`: the word you reach for instead, never beside.
 */
const cue = (from: number, to: number) =>
  ({ "--cue-from": `${from}%`, "--cue-to": `${to}%` }) as React.CSSProperties;

const alsoMean = ["kubernetes", "the cluster", "helm"];

const results = [
  { title: "Kubernetes node pool keeps evicting the worker", when: "4d" },
  { title: "Helm chart for staging drifted from prod again", when: "2w" },
  { title: "Why the cluster drains so slowly on deploy", when: "6w" },
];

export const VocabularyDemo = () => (
  <Panel name="Search" state="⌘K" className="w-full">
    <div className="flex items-baseline gap-3 border-b rule-carbon px-5 py-4">
      <span className="font-mono text-[0.8rem] text-brand-lit">›</span>
      <p
        className="cue-keys font-sans text-[0.95rem] text-quiet md:text-[1.05rem]"
        style={{ ...cue(4, 24), "--keys": 3 } as React.CSSProperties}
      >
        k8s
      </p>
    </div>

    {/* Offered, never assumed: every one of these is refusable, and the refusal takes effect at once. */}
    <div className="cue space-y-3 border-b rule-carbon px-5 py-4" style={cue(26, 38)}>
      <p className="label text-faint">You may also mean</p>
      <div className="flex flex-wrap gap-2">
        {alsoMean.map((word, index) => (
          <span
            key={word}
            className="cue inline-flex items-center gap-2 rounded-full border border-brand-lit/45 bg-brand-lit/10 px-3 py-1 font-mono text-[0.6875rem] tracking-[0.08em] text-quiet"
            style={cue(30 + index * 4, 42 + index * 4)}
          >
            {word}
            <span aria-hidden="true" className="text-faint">
              ×
            </span>
          </span>
        ))}
      </div>
    </div>

    <ul className="px-5 py-2">
      {results.map((result, index) => (
        <li
          key={result.title}
          className="cue flex items-baseline gap-3 border-b rule-carbon py-3 last:border-0"
          style={cue(44 + index * 5, 56 + index * 5)}
        >
          <p className="min-w-0 flex-1 truncate text-[0.9rem] text-quiet">{result.title}</p>
          <p className="label shrink-0 text-faint">{result.when}</p>
        </li>
      ))}
    </ul>

    {/* The belief, in the reader's own words, with the only button that matters beside it. */}
    <div
      className="cue flex flex-wrap items-center gap-x-4 gap-y-2 border-t rule-carbon bg-carbon-lift px-5 py-3"
      style={cue(60, 72)}
    >
      <p className="label text-faint">Learned</p>
      <p className="min-w-0 flex-1 text-[0.85rem] text-quiet">
        “k8s” and “kubernetes” are the same thing
      </p>
      <span className="label shrink-0 text-brand-lit">Forget this</span>
    </div>
  </Panel>
);
