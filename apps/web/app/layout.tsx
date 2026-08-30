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

/**
 * Where this build is served from, which is the one thing a static export cannot work out for
 * itself. It is written here rather than read from the environment because the same export is also
 * the desktop app's frontend, and a Tauri window has no origin worth resolving a social card
 * against. The marketing site keeps its own copy in `apps/www/components/links.tsx`.
 */
const APP = "https://app.useecho.dev";

const TITLE = "echo - open source no-ai note taker that learns with you";
const DESCRIPTION = "The note taker that learns with you. Local-first, private, open source.";

/**
 * The picture a link to the app unfurls into.
 *
 * This is the address that actually gets pasted into a chat, so it is the card most people see.
 * `scripts/og.mjs` draws it beside the site's two, from the same drawing: the brand field, the
 * wordmark and the echoes. Only the line under it differs, because this link opens echo rather
 * than describing it.
 */
export const metadata: Metadata = {
  metadataBase: new URL(APP),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "echo",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "The echo wordmark on the brand field, over the line THE NOTE TAKER THAT LEARNS WITH YOU, with rings leaving a source on the right.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
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

/**
 * The worker that keeps a copy of the application, registered before anything else is asked for.
 *
 * It used to register after hydration, and by then the browser had already fetched the stylesheet,
 * the fonts, the chunks and sixteen megabytes of database runtime with nothing watching: a first
 * visit left a cache that could not open the application offline, and the only way to complete it
 * was to download all of it a second time. Registered here it is claiming the page inside a
 * hundred milliseconds, before PGlite asks for its WebAssembly, so the heavy files land in the
 * cache as they arrive at no cost at all. `warmServiceWorker` backfills the handful of small ones
 * the preload scanner had already asked for by then.
 *
 * Not on the desktop, which serves every one of these files from disk and has nothing to gain from
 * a second copy of them. That is the one thing here that can fail open: Tauri has to have injected
 * itself before this runs, and if it has not, a desktop install caches files it will never read.
 */
const WORKER_ON_OPEN = `try{
if(!window.__TAURI_INTERNALS__&&'serviceWorker' in navigator)
navigator.serviceWorker.register('/sw.js?v=${process.env.NEXT_PUBLIC_ECHO_VERSION ?? "0.0.0"}')
.catch(function(){})
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
      {/* Never in development, where a cache in front of chunks that change on every save is a
          debugging session nobody asked for. */}
      {process.env.NODE_ENV === "production" && (
        <script dangerouslySetInnerHTML={{ __html: WORKER_ON_OPEN }} />
      )}
    </head>
    <body className="min-h-dvh font-sans antialiased">{children}</body>
  </html>
);

export default RootLayout;
