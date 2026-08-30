import { isDesktopApp } from "@/shared/lib/tauri";

/**
 * Hands the worker the list of what this page fetched before the worker was there to see it.
 *
 * Registration itself is a blocking script in `app/layout.tsx`, because when it happens decides
 * what it can catch: the version is carried in that URL, and the worker names its cache after it,
 * so a release both installs itself and throws away the runtime the last one kept. This is the
 * other half. Even registered in the head, a worker takes a few tens of milliseconds to install
 * and claim, and the preload scanner has already asked for the stylesheet, the fonts and the first
 * chunks by then. Those are the files a first visit would otherwise be missing offline.
 *
 * The resource timeline is that list exactly, already in the browser and free to read. The worker
 * skips everything it holds, so from the second visit on this asks for nothing, and what it does
 * ask for on the first is the small, immutable, still-in-the-HTTP-cache end of the build. The
 * database and model runtimes are not in it: they are megabytes, they are requested late, and by
 * then the worker is catching them live.
 */
export const warmServiceWorker = (): void => {
  if (process.env.NODE_ENV !== "production") return;
  if (isDesktopApp()) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage({
        type: "warm",
        urls: performance.getEntriesByType("resource").map((entry) => entry.name),
      });
    })
    .catch(() => {});
};
