import type { Echo } from "@echo/core";

/**
 * Browser composition root. PGlite ships WebAssembly, so it is imported lazily and only in the
 * browser — the server render never touches it.
 */
let pending: Promise<Echo> | undefined;

export function getEcho(): Promise<Echo> {
  if (!pending) {
    pending = (async () => {
      const [{ createEcho }, { openRepositories }] = await Promise.all([
        import("@echo/core"),
        import("@echo/db"),
      ]);
      const { repositories } = await openRepositories("idb://echo");
      return createEcho({ repositories });
    })();
  }
  return pending;
}
