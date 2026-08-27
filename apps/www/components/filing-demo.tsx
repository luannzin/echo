import { Panel } from "@/components/panel";

/**
 * The Inbox working the whole pile out before it moves any of it.
 *
 * The plan is something the reader reads, not something they undo: filing fourteen notes wrongly is
 * a far worse afternoon than filing them one at a time. The reason shown here is verbatim what the
 * running app answered when asked why a note was bound for Prod, followed by the notes that argued.
 */
const cue = (from: number, to: number) =>
  ({ "--cue-from": `${from}%`, "--cue-to": `${to}%` }) as React.CSSProperties;

const groups = [
  {
    where: "Prod",
    count: 5,
    lead: "Bump the pooler before the Friday deploy",
    reason: "you usually put deploy and pooler notes there",
    because: ["Rotate the pooler credentials", "Connection limit on the primary again"],
  },
  { where: "Payments", count: 6, lead: "Stripe webhook retries trip the rate limit" },
  { where: "Reading", count: 2, lead: "A tour of how Postgres builds a GIN index" },
  { where: "Staying in the Inbox", count: 1, lead: "call mum", quiet: true },
];

export const FilingDemo = () => (
  <Panel name="Inbox · Organize" state="14 notes" className="w-full">
    <ul>
      {groups.map((group, index) => (
        <li
          key={group.where}
          className="cue border-b rule-carbon px-5 py-4"
          style={cue(6 + index * 7, 22 + index * 7)}
        >
          <div className="flex items-baseline gap-3">
            <p
              className={`label ${group.quiet ? "text-faint" : "text-brand-lit"} min-w-0 truncate`}
            >
              {group.where}
            </p>
            <p className="label ml-auto shrink-0 text-faint">
              {group.count === 1 ? "1 note" : `${group.count} notes`}
            </p>
          </div>
          <p className="mt-2 truncate text-[0.9rem] text-quiet">{group.lead}</p>

          {/* A reason you can open is a reason you can disagree with. A percentage is not. */}
          {group.reason ? (
            <div
              className="cue mt-3 border-t rule-carbon pt-3"
              style={cue(24 + index * 7, 40 + index * 7)}
            >
              <p className="text-[0.85rem] text-quiet">
                <span className="text-faint">Why? </span>
                {group.reason}
              </p>
              <ul className="mt-2 space-y-1">
                {group.because?.map((note) => (
                  <li key={note} className="truncate text-[0.8rem] text-faint">
                    ↳ {note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </li>
      ))}
    </ul>

    <div
      className="cue flex flex-wrap items-center gap-x-4 gap-y-2 bg-carbon-lift px-5 py-3.5"
      style={cue(58, 70)}
    >
      <span className="rounded-md bg-brand-lit px-3 py-1.5 font-mono text-[0.6875rem] tracking-[0.08em] text-carbon uppercase">
        File 13
      </span>
      <p className="label text-faint">Nothing has moved yet</p>
    </div>
  </Panel>
);
