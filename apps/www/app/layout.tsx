import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import { Filters } from "@/components/filters";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

/** Display face, hero type only — the same one the application uses for its rare large type. */
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "echo — the note taker that learns with you",
  description:
    "Open source, local-first note taking. Search, organisation and learning run on your machine. No account, no API key, no server.",
};

export const viewport: Viewport = {
  themeColor: "#1a1aff",
};

const SiteLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
    <body className="bg-brand text-ink font-sans">
      <Filters />
      {children}
      <div className="grain" />
    </body>
  </html>
);

export default SiteLayout;
