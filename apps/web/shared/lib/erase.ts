import { forgetPreferences } from "@/shared/lib/preferences";

/**
 * Everything echo has stored on this device, gone.
 *
 * There is no server and no copy, so this is the only delete there is and it is final. It is behind
 * a typed confirmation in settings for exactly that reason: a reader who reaches this has said the
 * word, and nothing here asks them a second time.
 *
 * The databases are found rather than named. PGlite decides what to call the store behind
 * `idb://echo`, and a name written down here would be a name that goes stale the next time that
 * changes — while a leftover store is a reader who pressed delete and still has their notes.
 */
export const eraseEverything = async (): Promise<void> => {
  forgetPreferences();
  window.localStorage.clear();
  window.sessionStorage.clear();

  // `databases()` is the only way to enumerate them, and Firefox only grew it recently. Where it is
  // missing the stores are left behind, and the reload below still opens onto an app that has
  // forgotten every preference — so this degrades to less than it promises rather than to nothing.
  const stores = await indexedDB.databases?.().catch(() => []);
  await Promise.all(
    (stores ?? [])
      .map((store) => store.name)
      .filter((name): name is string => name !== undefined)
      .filter((name) => /echo|pglite/i.test(name))
      .map(
        (name) =>
          new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(name);
            // Resolved on every ending, blocked included: a store another tab is holding open is a
            // store that cannot go now, and waiting forever would leave the button spinning.
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
  );

  // A reload rather than a re-render: everything in memory was read out of what has just gone.
  window.location.replace(window.location.pathname);
};
