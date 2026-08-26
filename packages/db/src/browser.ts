import type { Repositories } from "@echo/core";
import { PGlite } from "@electric-sql/pglite";
import { openRepositories } from "./index";
import type { createLexicalSearch } from "./search";

/**
 * The browser's way in. Where the database runs is this package's business and nobody else's — the
 * app asks for repositories and gets them.
 *
 * The WebAssembly is fetched from the host application rather than assembled by the bundler. That is
 * partly principle — a local-first app should serve its own runtime, and `runtimePath` is a folder
 * the deployment copies, the same arrangement the embedding runtime has. It is also necessity:
 * minifying PGlite mangles the Emscripten module it uses to instantiate itself, and the failure
 * appears only in a production build, as an app that starts and then cannot open its own database.
 *
 * ponytail: this runs on the main thread. `@electric-sql/pglite/worker` is the intended home — it
 * would take every query off the writing surface's thread and make a second tab safe through leader
 * election — but PGlite's bundled data loader reads `window.location` to find its own files, so the
 * worker build throws `window is not defined` before `fsBundle` is ever consulted. Revisit when
 * PGlite's worker entry stops assuming a document.
 */
export const openBrowserRepositories = async ({
  dataDir = "idb://echo",
  runtimePath = "/pglite/",
}: {
  dataDir?: string;
  runtimePath?: string;
} = {}): Promise<{
  repositories: Repositories;
  lexical: ReturnType<typeof createLexicalSearch>;
}> => {
  const [pgliteWasmModule, initdbWasmModule, fsBundle] = await Promise.all([
    WebAssembly.compileStreaming(fetch(`${runtimePath}pglite.wasm`)),
    WebAssembly.compileStreaming(fetch(`${runtimePath}initdb.wasm`)),
    fetch(`${runtimePath}pglite.data`).then((response) => response.blob()),
  ]);

  // Relaxed durability: the query returns as soon as Postgres has the row, and the flush to
  // IndexedDB happens behind it. Without it every capture blocked the writing surface for ~80ms
  // waiting on a store nothing was reading. The window it opens is a tab killed in the moments
  // between those two, against a database whose whole job is to survive a reload — worth it for a
  // capture that keeps up with typing.
  const client = await PGlite.create({
    dataDir,
    pgliteWasmModule,
    initdbWasmModule,
    fsBundle,
    relaxedDurability: true,
  });
  return openRepositories(client);
};
