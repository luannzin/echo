import type { Content } from "@/content/en";

/**
 * The other language, offered rather than imposed.
 *
 * A link, not a redirect. Sending a visitor whose browser says `pt` to the Portuguese document would
 * break the back button, split the crawl, and take the choice away from the many Brazilians who read
 * documentation in English on purpose — so the site says which languages it has and lets them pick.
 * The label is written in the language it leads to, which is the one word a reader of that language
 * is certain to recognise.
 *
 * It appears at both ends of a long page, so it is one component: the tag it emits used to be worked
 * out from the display label (`label === "English" ? "en" : "pt-BR"`) in two places, which meant a
 * third language would have shipped the wrong `hreflang` twice. The content says its own tag now.
 */
export const LanguageLink = ({
  other,
  className,
}: {
  other: Content["other"];
  className?: string;
}) => (
  <a
    href={other.href}
    hrefLang={other.lang}
    lang={other.lang}
    className={`label text-ink/85 transition-colors hover:text-ink ${className ?? ""}`}
  >
    {other.label}
  </a>
);
