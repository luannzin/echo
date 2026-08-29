import { LanguageLink } from "@/components/language-link";
import { REPO } from "@/components/links";
import type { Content } from "@/content/en";

/**
 * The nav, and the only place the other language is offered above the fold.
 *
 * The button here is deliberately not a `Cta`: it is smaller than the ones in the hero and the
 * footer, and it inverts on hover rather than washing, because a control sitting on a sticky bar
 * over moving content has to separate from whatever scrolls under it.
 */
export const SiteNav = ({ content }: { content: Content }) => (
  <header className="sticky top-0 z-50 bg-brand/90 backdrop-blur-md">
    <nav className="shell flex items-center gap-6 py-4">
      <a href="#top" className="display text-[1.7rem] normal-case md:text-[1.9rem]">
        echo
      </a>

      <div className="ml-auto flex items-center gap-6">
        {content.nav.links.map((link) => (
          <a
            key={link.label}
            href={link.href ?? REPO}
            className="label hidden text-ink/85 transition-colors hover:text-ink md:block"
          >
            {link.label}
          </a>
        ))}
        <LanguageLink
          other={content.other}
          className="underline decoration-ink/30 underline-offset-4"
        />
        <a
          href="#install"
          className="press label border rule-ink px-3.5 py-2 text-ink/85 transition-colors hover:bg-ink hover:text-brand"
        >
          {content.nav.run}
        </a>
      </div>
    </nav>
  </header>
);
