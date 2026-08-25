/**
 * Copies the ONNX Runtime WebAssembly binaries into `public/`, so the embedding model runs without
 * fetching anything from a CDN. A local-first app cannot depend on someone else's uptime to think.
 *
 * Run through `bun run predev` / `prebuild`; the files are generated, never committed.
 */
import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FILES = [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
];

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(appRoot, "node_modules", "onnxruntime-web", "dist");
const target = join(appRoot, "public", "ort");

await mkdir(target, { recursive: true });
for (const file of FILES) {
  await cp(join(source, file), join(target, file));
}

console.log(`synced ${FILES.length} onnxruntime files into public/ort`);
