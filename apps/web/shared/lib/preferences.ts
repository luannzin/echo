/** `localStorage` keeps these synchronous, so a panel never flashes open before its stored answer. */
export const readPreference = (key: string, fallback: boolean): boolean => {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(`echo:${key}`);
  return stored === null ? fallback : stored === "true";
};

export const writePreference = (key: string, value: boolean): void => {
  window.localStorage.setItem(`echo:${key}`, String(value));
};
