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

/**
 * Which language the window was left in, decided before anything paints.
 *
 * Same reason as `MODE_ON_OPEN`, and the same shape: the prerendered markup carries `lang="en"`
 * because a static export has to carry something, and only a blocking script can correct it before
 * the first frame. React reads the attribute back on mount rather than deciding again, so there is
 * one answer to what language this is and it is the one already on screen.
 *
 * Matched on the language subtag alone, mirroring `negotiate` in `shared/lib/i18n/locales.ts`: a
 * browser set to `pt-PT` is closer to this than to English. It fails to English.
 */
const LANGUAGE_ON_OPEN = `try{
var s=localStorage.getItem('echo:locale');
var l=['en','pt-BR'];
if(l.indexOf(s)<0){s=null;
for(var i=0;i<navigator.languages.length&&!s;i++){
var t=navigator.languages[i].toLowerCase().split('-')[0];
for(var j=0;j<l.length;j++)if(l[j].toLowerCase().split('-')[0]===t){s=l[j];break}}}
document.documentElement.lang=s||'en'
}catch(e){}`;

/**
 * How the window looks, decided before anything paints.
 *
 * The markup ships with `class="dark"` because a static export has to ship with something, and this
 * only ever takes it off. Failing closed means failing to dark, which is what echo was before there
 * was a choice: a light reader sees one dark frame at worst, and only where the script cannot run.
 */
const APPEARANCE_ON_OPEN = `try{
var t=localStorage.getItem('echo:theme')||'dark';
var l=t==='light'||(t==='system'&&matchMedia('(prefers-color-scheme: light)').matches);
document.documentElement.classList.toggle('dark',!l);
document.documentElement.style.colorScheme=l?'light':'dark';
if(localStorage.getItem('echo:motion')==='reduced')
document.documentElement.dataset.echoMotion='reduced'
}catch(e){}`;

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html
    lang="en"
    className={`dark ${sans.variable} ${mono.variable} ${display.variable}`}
    suppressHydrationWarning
  >
    <head>
      <script dangerouslySetInnerHTML={{ __html: MODE_ON_OPEN }} />
      <script dangerouslySetInnerHTML={{ __html: LANGUAGE_ON_OPEN }} />
      <script dangerouslySetInnerHTML={{ __html: APPEARANCE_ON_OPEN }} />
    </head>
    <body className="min-h-dvh font-sans antialiased">{children}</body>
  </html>
);

export default RootLayout;
