import { Cta } from "@/components/cta";
import { Engraving } from "@/components/engraving";
import { LanguageLink } from "@/components/language-link";
import { APP, COFFEE, REPO } from "@/components/links";
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
          <Cta href={APP} tone="solid" size="lg">
            {content.footer.open}
          </Cta>
          <Cta href="#install" tone="outline" size="lg">
            {content.footer.run}
          </Cta>
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
          <LanguageLink other={content.other} />
          {/* Reachable at the foot as well as in its own section: a reader who scrolled past the
              ask and then changed their mind should not have to scroll back up to act on it. */}
          <a href={COFFEE} className="label text-ink/85 transition-colors hover:text-ink">
            {content.footer.coffee}
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
