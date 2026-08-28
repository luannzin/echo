import { REPO } from "@/components/links";
import type { Content } from "@/content/en";

/**
 * The nav, and the only place the other language is offered above the fold.
 *
 * A link rather than a redirect. Sending a visitor whose browser says `pt` to the Portuguese
 * document would break the back button, split the crawl, and take the choice away from the many
 * Brazilians who read documentation in English on purpose — so the site says which languages it has
 * and lets them pick. The label is written in the language it leads to, which is the one word a
 * reader of that language is certain to recognise.
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
        <a
          href={content.other.href}
          hrefLang={content.other.label === "English" ? "en" : "pt-BR"}
          className="label text-ink/85 underline decoration-ink/30 underline-offset-4 transition-colors hover:text-ink"
        >
          {content.other.label}
        </a>
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
