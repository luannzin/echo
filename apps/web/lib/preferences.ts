/**
 * Small, boring interface preferences. `localStorage` keeps them synchronous, so a panel never
 * flashes open before the stored answer arrives — the database is for notes, not for chrome.
 */
export function readPreference(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(`echo:${key}`) === null
    ? fallback
    : window.localStorage.getItem(`echo:${key}`) === "true";
}

export function writePreference(key: string, value: boolean): void {
  window.localStorage.setItem(`echo:${key}`, String(value));
}
