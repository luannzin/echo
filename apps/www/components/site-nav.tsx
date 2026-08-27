import { REPO } from "@/components/links";

const links = [
  { label: "What it does", href: "#write" },
  { label: "How it runs", href: "#facts" },
  { label: "GitHub", href: REPO },
];

export const SiteNav = () => (
  <header className="sticky top-0 z-50 bg-brand/90 backdrop-blur-md">
    <nav className="shell flex items-center gap-6 py-4">
      <a href="#top" className="display text-[1.7rem] normal-case md:text-[1.9rem]">
        echo
      </a>

      <div className="ml-auto flex items-center gap-6">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="label hidden text-ink/85 transition-colors hover:text-ink md:block"
          >
            {link.label}
          </a>
        ))}
        <a
          href="#install"
          className="press label border rule-ink px-3.5 py-2 text-ink/85 transition-colors hover:bg-ink hover:text-brand"
        >
          Run it locally
        </a>
      </div>
    </nav>
  </header>
);
