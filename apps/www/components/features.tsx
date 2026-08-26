import { type Feature, FeatureCard } from "@/components/feature-card";

const features: Feature[] = [
  {
    index: "1",
    kicker: "Capture",
    title: "One box, no forms",
    body: "A composer that is already focused. Enter commits the note, the title comes from what you wrote, and one keystroke takes it back.",
    plate: "spiral",
    drift: "9%",
  },
  {
    index: "2",
    kicker: "Search",
    title: "Words first, meaning next",
    body: "Full text answers while you type. The local model catches up a moment later and adds what you meant, not only what you typed.",
    plate: "orb",
    drift: "5%",
  },
  {
    index: "3",
    kicker: "Learn",
    title: "Your own vocabulary",
    body: "echo learns the words you actually use and which ones you write instead of each other. Nothing is trained — your notes are the model.",
    plate: "mesh",
    drift: "11%",
  },
  {
    index: "4",
    kicker: "Time",
    title: "A week you can walk back",
    body: "This week, what changed since your last visit, and the days behind them — read from the dates written inside the notes themselves.",
    plate: "wave",
    drift: "6%",
  },
  {
    index: "5",
    kicker: "Private",
    title: "Nothing leaves the machine",
    body: "Postgres compiled to WebAssembly, running in your tab. No account, no server, and no API key for any core feature. Ever.",
    plate: "field",
    drift: "10%",
  },
  {
    index: "6",
    kicker: "Everywhere",
    title: "Offline by default",
    body: "It installs as an app, opens with no network after the first visit, and the desktop build is the same code in a native window.",
    plate: "burst",
    drift: "7%",
  },
];

export const Features = () => (
  <section id="features" className="scroll-mt-20 px-3 md:px-6">
    <div className="relative mx-auto w-full max-w-[1600px] bg-paper px-6 py-16 text-brand md:px-12 md:py-20">
      {/* The mark rides the top edge of the slab, the way a printer's stamp sits on a plate. */}
      <div className="absolute -top-7 left-6 grid size-14 place-items-center border rule-brand bg-brand text-ink md:left-12">
        <span className="display text-2xl normal-case">e</span>
      </div>
      <div className="grid gap-x-10 gap-y-20 pt-10 md:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard key={feature.index} feature={feature} />
        ))}
      </div>
    </div>
  </section>
);
