import { Shot } from "@/components/shot";

const features = [
  {
    label: "Search",
    title: "Ask it the way you would ask a person",
    body: "“notes about caching in payments” is two questions wearing one coat. echo pulls the subject away from the project, filters on each, and shows every filter as a chip that is one press from gone. It says how many notes it set aside, because a search that quietly ignores half of what you typed is one you stop trusting.",
    shot: {
      src: "/shots/search.webp",
      width: 1264,
      height: 762,
      alt: "The command palette holding “notes about caching in payments”. A removable Payments chip has been lifted out of the query, the words “notes about” are left as the subject, sixteen notes are marked set aside, and the four payments notes are listed underneath.",
    },
  },
  {
    label: "Filing",
    title: "Every guess shows its work",
    body: "echo suggests where a note belongs and then names the notes that argued for it: ones you can open and disagree with, rather than a percentage you can only accept. And because filing ten notes wrongly is a far worse afternoon than filing them one at a time, the Inbox works the whole pile out first and moves nothing until you press it.",
    shot: {
      src: "/shots/inbox.webp",
      width: 2880,
      height: 1760,
      alt: "The Inbox with ten notes to place. Each row offers one folder and, underneath, the sentences behind it — the notes already filed there, and the habit echo read out of them.",
    },
  },
  {
    label: "Neighbours",
    title: "A note arrives with the notes it belongs to",
    body: "Open one and the panel beside it fills with the notes it connects to, each with the reason in words rather than a score: it is in the same project, you wrote them around the same time, you usually open them together. The concepts across the top came out of the note itself, and any of them can be taken off.",
    shot: {
      src: "/shots/note.webp",
      width: 2880,
      height: 1760,
      alt: "A note about payment retries open in echo, with concepts along the top and a panel of related notes beside it, each naming why it is related.",
    },
  },
  {
    label: "Vocabulary",
    title: "It learns your words, not a dictionary’s",
    body: "You type k8s. Half your notes say kubernetes and the rest say the cluster. echo works that out from the company your words keep, so searching one finds the other — including notes that contain neither the letters nor the sound of what you typed. Nothing was trained on anything: your own notes are the whole of the evidence.",
    shot: {
      src: "/shots/meaning.webp",
      width: 1264,
      height: 952,
      alt: "Searching for k8s. The first result contains the letters; the second is a note about a kubernetes rollout that does not, found by meaning rather than by spelling.",
    },
  },
];

/**
 * Four claims, four screens, one grid.
 *
 * Ruled cells rather than four full-width sections, because past the first demonstration a reader is
 * comparing rather than being introduced, and four alternating two-column rows is a grid pretending
 * to be a narrative. The rules are on the cells and the measure is still `.shell`'s, so the leading
 * edge does not move from the section above.
 *
 * Cells start at the top rather than stretching: the shots are the app's own screens at their own
 * proportions, and squaring them off would mean cropping the part that proves the claim.
 */
export const Features = () => (
  <section id="features" className="scroll-mt-24 py-16 md:py-24">
    <div className="shell">
      <div className="reveal max-w-3xl">
        <p className="label text-ink/85">What it does with what you wrote</p>
        <h2 className="display mt-4 text-[clamp(2rem,3.6vw,3.4rem)]">
          Four things, all of them on screen
        </h2>
      </div>

      <div className="mt-12 grid items-start gap-x-14 gap-y-12 border-t rule-ink pt-12 md:mt-16 lg:grid-cols-2">
        {features.map((feature) => (
          <article key={feature.title} className="reveal min-w-0">
            <p className="label text-ink/70">{feature.label}</p>
            <h3 className="display mt-3 text-[clamp(1.5rem,2.2vw,2.05rem)]">{feature.title}</h3>
            <p className="prose-body mt-4 text-ink/85">{feature.body}</p>
            <Shot className="mt-7" {...feature.shot} />
          </article>
        ))}
      </div>
    </div>
  </section>
);
