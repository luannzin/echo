import { Engraving, type Plate } from "@/components/engraving";
import { REPO } from "@/components/links";

const platforms: { kicker: string; name: string; action: string; href: string; plate: Plate }[] = [
  {
    kicker: "Any browser",
    name: "Web",
    action: "Install as an app",
    href: "#install",
    plate: "mesh",
  },
  {
    kicker: "macOS · Windows · Linux",
    name: "Desktop",
    action: "Build the window",
    href: `${REPO}#installing-it`,
    plate: "orb",
  },
  {
    kicker: "A folder of files",
    name: "Self-host",
    action: "Read the docs",
    href: `${REPO}/tree/main/docs`,
    plate: "wave",
  },
];

export const Platforms = () => (
  <section className="mx-auto w-full max-w-[1600px] px-6 pb-20 md:px-10 md:pb-28">
    <p className="label text-center text-ink/70">Same build, three hosts</p>
    <h2 className="display mx-auto mt-4 max-w-4xl text-center text-[clamp(2.1rem,4.6vw,4.1rem)]">
      Your notes on every machine you own
    </h2>
    <div className="mt-12 grid gap-4 md:grid-cols-3">
      {platforms.map((platform) => (
        <article
          key={platform.name}
          className="reveal relative flex aspect-[4/5] flex-col items-center justify-center overflow-hidden border rule-ink bg-brand-deep md:aspect-[4/3]"
        >
          <Engraving
            plate={platform.plate}
            className="parallax absolute inset-0 size-full opacity-40"
            style={{ "--parallax": "5%" } as React.CSSProperties}
          />
          {/* The plate is a texture, not a subject: sunk back so the label on top stays the loudest thing. */}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/70 to-transparent" />
          <div className="relative grid place-items-center gap-4 px-6 text-center">
            <p className="label text-ink">{platform.kicker}</p>
            <p className="display text-[clamp(2rem,3.4vw,3rem)] normal-case">{platform.name}</p>
            <a
              href={platform.href}
              className="label border rule-ink bg-ink px-4 py-2.5 text-brand transition-colors hover:bg-brand hover:text-ink"
            >
              {platform.action} →
            </a>
          </div>
        </article>
      ))}
    </div>
  </section>
);
