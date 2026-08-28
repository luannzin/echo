import { Engraving } from "@/components/engraving";
import { REPO } from "@/components/links";
import type { Content } from "@/content/en";

export const SiteFooter = ({ content }: { content: Content }) => (
  <footer className="relative overflow-hidden pt-16 md:pt-24">
    {/*
     * The name at poster scale, behind the closing line rather than in a band of its own. It is
     * deliberately wider than the viewport and centred by flex, because mx-auto cannot centre
     * something wider than its container, and the bleed has to be equal on both sides or the drift
     * reads as a mistake.
     */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-4 flex justify-center opacity-[0.14]"
    >
      <p className="display drift shrink-0 whitespace-nowrap text-[26vw] leading-[0.75] text-ink normal-case">
        echo · echo
      </p>
    </div>

    <div className="shell relative">
      {/* The closing block is centred on purpose, but it is centred inside the same measure. */}
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="display text-[clamp(2.4rem,5.4vw,5rem)]">{content.footer.title}</h2>
        <p className="prose-lede mx-auto mt-6 text-ink/85">{content.footer.lede}</p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#install"
            className="press label border rule-ink bg-ink px-6 py-3 text-brand transition-colors hover:bg-brand-deep hover:text-ink"
          >
            {content.footer.run}
          </a>
          <a
            href={REPO}
            className="press label border rule-ink px-6 py-3 text-ink/85 transition-colors hover:bg-ink/10 hover:text-ink"
          >
            {content.footer.source}
          </a>
        </div>
      </div>

      {/* The plate dissolves rather than stopping: a hard edge here would read as a cropped photo. */}
      <div className="relative mx-auto mt-14 -mb-10 h-[34vh] max-w-3xl overflow-hidden [mask-image:radial-gradient(ellipse_at_center,black_38%,transparent_76%)] md:h-[42vh]">
        <Engraving plate="orb" className="parallax absolute inset-0 size-full" />
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-2 border-t rule-ink py-6">
        <p className="label text-ink/85">{content.footer.tagline}</p>
        <div className="flex items-center gap-5">
          {/* The switcher again at the foot, so the choice is reachable at both ends of a long page. */}
          <a
            href={content.other.href}
            hrefLang={content.other.label === "English" ? "en" : "pt-BR"}
            className="label text-ink/85 transition-colors hover:text-ink"
          >
            {content.other.label}
          </a>
          <a
            href={`${REPO}/tree/main/docs`}
            className="label text-ink/85 transition-colors hover:text-ink"
          >
            {content.footer.docs}
          </a>
        </div>
      </div>
    </div>
  </footer>
);
