/**
 * Registered only in a build, because in development the served chunks change on every save and a
 * cache in front of them is a debugging session nobody asked for.
 */
export const registerServiceWorker = (): void => {
  if (process.env.NODE_ENV !== "production") return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("/sw.js").catch(() => {});
};
