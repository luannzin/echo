import { REPO } from "@/components/links";

const left = [
  { label: "Github", href: REPO, place: "justify-self-start" },
  { label: "Docs", href: `${REPO}/tree/main/docs`, place: "justify-self-center" },
];

const right = [
  { label: "Features", href: "#features", place: "justify-self-center" },
  { label: "Get echo →", href: "#install", place: "justify-self-end" },
];

export const SiteNav = () => (
  <header className="sticky top-0 z-50 bg-brand/90 backdrop-blur-md">
    <nav className="mx-auto grid w-full max-w-[1600px] grid-cols-2 items-center gap-4 px-6 py-5 md:grid-cols-5 md:px-10">
      {left.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className={`label hidden text-ink/75 transition-colors hover:text-ink md:block ${link.place}`}
        >
          {link.label}
        </a>
      ))}
      <a
        href="#top"
        className="display justify-self-start text-[1.7rem] normal-case md:justify-self-center md:text-[2rem]"
      >
        echo
      </a>
      {right.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className={`label hidden text-ink/75 transition-colors hover:text-ink md:block ${link.place}`}
        >
          {link.label}
        </a>
      ))}
      <a href="#install" className="label justify-self-end text-ink/75 md:hidden">
        Get echo →
      </a>
    </nav>
  </header>
);
