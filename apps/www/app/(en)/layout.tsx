import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import { Filters } from "@/components/filters";
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
  openGraph: {
    title: en.meta.title,
    description: en.meta.description,
    locale: "en_US",
    type: "website",
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
    </body>
  </html>
);

export default EnglishLayout;
