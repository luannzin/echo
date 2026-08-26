import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

/** Display face, hero type only. Swapping it is this declaration and nothing else. */
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "echo - open source no-ai note taker that learns with you",
  description: "The note taker that learns with you. Local-first, private, open source.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
};

/**
 * Which mode the window was left in, decided before anything paints.
 *
 * This is a static export: the prerendered markup is on screen long before React has loaded, so a
 * window closed in editor mode would show the full shell first and swap after hydration. Nothing
 * inside React can prevent that — only a blocking script in the head can, which is the same trick a
 * theme uses. It sets the attribute; the stylesheet holds the shell back; React takes the attribute
 * over on mount.
 *
 * It fails closed. Tauri has to have injected itself first for this to fire, and if it has not, the
 * shell paints and React swaps after hydration — the flash comes back, in the desktop app, and
 * nothing worse. Setting it on the website instead would hold back a shell nothing ever replaces.
 */
const MODE_ON_OPEN = `try{
if(window.__TAURI_INTERNALS__&&localStorage.getItem('echo:editor-mode')==='true')
document.documentElement.dataset.echoMode='editor'
}catch(e){}`;

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html
    lang="en"
    className={`dark ${sans.variable} ${mono.variable} ${display.variable}`}
    suppressHydrationWarning
  >
    <head>
      <script dangerouslySetInnerHTML={{ __html: MODE_ON_OPEN }} />
    </head>
    <body className="min-h-dvh font-sans antialiased">{children}</body>
  </html>
);

export default RootLayout;
