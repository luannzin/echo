import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import { Analytics } from "@/components/analytics";
import { Filters } from "@/components/filters";
import { SITE } from "@/components/links";
import { en } from "@/content/en";
import "../globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

/** Display face, hero type only: the same one the application uses for its rare large type. */
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  /**
   * The site has a domain now, so `canonical`, `alternates` and the social card resolve against it
   * rather than against whatever host happens to be serving the export. Without a base, Next leaves
   * these relative and a crawler reading the page from a preview URL canonicalises to the preview.
   */
  metadataBase: new URL(SITE),
  title: en.meta.title,
  description: en.meta.description,
  /**
   * The two documents point at each other, and `x-default` points at the root — which is the
   * English one, because English keeps `/`. A static export cannot serve a redirect, and a
   * detection redirect would be wrong for the many readers who read documentation in English on
   * purpose, so the choice is a link in the nav and a crawler is told where the other one is.
   */
  alternates: {
    canonical: "/",
    languages: { en: "/", "pt-BR": "/pt-br/", "x-default": "/" },
  },
  /**
   * The picture a link to this document unfurls into, and the one thing about the site most people
   * see before they see the site. `scripts/og.mjs` draws it as `assets/banner.svg` at another
   * ratio, so the card, the README and the tab are one identity rather than three.
   *
   * The dimensions are declared rather than left to be discovered: a crawler that has to fetch the
   * file to learn them renders a link as a small square until it has, and some never come back.
   */
  openGraph: {
    title: en.meta.title,
    description: en.meta.description,
    url: "/",
    siteName: "echo",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: en.meta.alt }],
  },
  /**
   * X reads `og:*` when these are absent, but not `summary_large_image`, and without that the card
   * is a thumbnail beside the title rather than the picture.
   */
  twitter: {
    card: "summary_large_image",
    title: en.meta.title,
    description: en.meta.description,
    images: [{ url: "/og.png", alt: en.meta.alt }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1aff",
};

/**
 * One of two root layouts.
 *
 * There is deliberately no `app/layout.tsx`: two route groups with nothing above them is Next's
 * multiple-root-layouts arrangement, and it is what lets each document declare its own `<html lang>`
 * without a dynamic segment — which a static export cannot pair with a root redirect anyway.
 */
const EnglishLayout = ({ children }: { children: ReactNode }) => (
  <html
    lang="en"
    className={`${sans.variable} ${mono.variable} ${display.variable} overflow-x-hidden`}
  >
    <body className="bg-brand text-ink font-sans">
      <Filters />
      {children}
      <div className="grain" />
      <Analytics />
    </body>
  </html>
);

export default EnglishLayout;
