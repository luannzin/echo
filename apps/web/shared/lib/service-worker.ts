/**
 * Registered only in a build, because in development the served chunks change on every save and a
 * cache in front of them is a debugging session nobody asked for.
 *
 * The version is carried in the URL, and the worker names its cache after it. A browser treats a
 * changed worker URL as a new worker, so a release both installs itself and — because the name it
 * caches under moved with it — throws away the runtime the last one had kept. Without that the
 * WebAssembly, which is served from a path rather than a content hash, would never be replaced.
 */
export const registerServiceWorker = (): void => {
  if (process.env.NODE_ENV !== "production") return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const version = process.env.NEXT_PUBLIC_ECHO_VERSION ?? "0.0.0";
  void navigator.serviceWorker.register(`/sw.js?v=${version}`).catch(() => {});
};
