import { Engraving } from "@/components/engraving";
import { REPO } from "@/components/links";

export const SiteFooter = () => (
  <footer className="relative overflow-hidden pt-20">
    <div className="relative mx-auto w-full max-w-[1600px] px-6 text-center md:px-10">
      <p className="label text-ink/70">Local · Private · Yours</p>
      <h2 className="display mx-auto mt-5 max-w-4xl text-[clamp(2.4rem,6vw,5.4rem)]">
        Take it with you
      </h2>
      <p className="mx-auto mt-6 max-w-lg text-ink/80 leading-relaxed">
        Clone it, run it, keep it. No account to create, nothing to switch off later.
      </p>
      <a
        href={REPO}
        className="label mt-9 inline-block border rule-ink bg-ink px-6 py-3 text-brand transition-colors hover:bg-brand hover:text-ink"
      >
        Read the source →
      </a>

      {/* The plate dissolves rather than stopping: a hard edge here would read as a cropped photo. */}
      <div className="relative mx-auto mt-16 -mb-10 h-[42vh] max-w-3xl overflow-hidden [mask-image:radial-gradient(ellipse_at_center,black_38%,transparent_76%)] md:h-[52vh]">
        <Engraving plate="orb" className="parallax absolute inset-0 size-full" />
      </div>

      <div className="relative flex items-center justify-between border-t rule-ink py-6">
        <p className="label text-ink/70">echo · local-first notes</p>
        <p className="label text-ink/70">Built in the open · 2026</p>
      </div>
    </div>
  </footer>
);
