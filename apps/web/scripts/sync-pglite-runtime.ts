/**
 * Copies PGlite's WebAssembly and data files into `public/`, so the database is served by the app
 * itself rather than assembled by the bundler.
 *
 * This is not only a preference. Minifying PGlite's Emscripten module breaks the function it uses to
 * instantiate its own WebAssembly, and the failure appears only in a production build: the app
 * compiles, serves, and then cannot open its database. Handing PGlite the compiled modules directly
 * takes the bundler out of the question entirely — the same arrangement `sync-onnx-runtime.ts` makes
 * for the embedding runtime, and for the same reason.
 *
 * Run through `bun run predev` / `prebuild`; the files are generated, never committed.
 */
import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(appRoot, "public", "pglite");

// Resolved rather than guessed at: the package may be hoisted, isolated, or linked, and the path
// under `node_modules` is the package manager's business rather than this script's.
const require = createRequire(import.meta.url);
const source = join(dirname(require.resolve("@electric-sql/pglite")), "..", "dist");

const files = ["pglite.wasm", "initdb.wasm", "pglite.data"];

await mkdir(target, { recursive: true });
for (const file of files) {
  await cp(join(source, file), join(target, file));
}

console.log(`synced ${files.length} pglite files into public/pglite`);
