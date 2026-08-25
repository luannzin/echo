/**
 * Copies the ONNX Runtime WebAssembly binaries into `public/`, so the embedding model runs without
 * fetching anything from a CDN. A local-first app cannot depend on someone else's uptime to think.
 *
 * Run through `bun run predev` / `prebuild`; the files are generated, never committed.
 */
import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(appRoot, "node_modules", "onnxruntime-web", "dist");
const target = join(appRoot, "public", "ort");

/**
 * Every variant, not a guess: the runtime chooses between the plain, jsep, asyncify and jspi builds
 * at load time based on the browser's capabilities, and a missing one fails as "no available
 * backend". They are large but generated, gitignored, and only the chosen pair is ever downloaded.
 */
const files = (await readdir(source)).filter((file) => /^ort-wasm.*\.(wasm|mjs)$/.test(file));

await mkdir(target, { recursive: true });
for (const file of files) {
  await cp(join(source, file), join(target, file));
}

console.log(`synced ${files.length} onnxruntime files into public/ort`);
