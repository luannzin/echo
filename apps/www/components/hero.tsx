import { Engraving } from "@/components/engraving";
import { InstallBox } from "@/components/install-box";

export const Hero = () => (
  <section id="top" className="relative mx-auto w-full max-w-[1600px] px-6 md:px-10">
    <div className="grid items-center gap-14 py-12 md:min-h-[86vh] md:grid-cols-[1.05fr_0.95fr] md:gap-8 md:py-16">
      <div className="rise min-w-0">
        <p className="label text-ink/70">Open source · Local first · No API key</p>
        <h1 className="display mt-5 text-[clamp(3rem,7.8vw,7.4rem)]">
          The note taker that learns with you
        </h1>
        <p className="mt-7 max-w-md text-[1.02rem] leading-relaxed text-ink/80">
          It doesn't think for you. It learns how you think — every note you file teaches the
          search, and all of it runs on your own machine.
        </p>
        <div id="install" className="mt-8 scroll-mt-28">
          <p className="label mb-3 text-ink/70">Run it locally</p>
          <InstallBox />
        </div>
      </div>

      <div className="relative aspect-square w-full overflow-hidden max-md:-order-1 max-md:aspect-[4/3]">
        <Engraving plate="burst" className="absolute inset-0 size-full" />
      </div>
    </div>
  </section>
);
