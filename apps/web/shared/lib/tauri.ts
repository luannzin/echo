/**
 * Whether this is the desktop app rather than the website. One build serves both, so anything the
 * two do not share asks here.
 *
 * `__TAURI_INTERNALS__` is what Tauri v2 puts on the window to talk to the Rust side; there is no
 * flag of our own to set, because a flag baked in at build time would mean two builds.
 */
export const isDesktopApp = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
