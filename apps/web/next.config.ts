import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { NextConfig } from "next";

/**
 * transformers.js on disk, by path rather than by name.
 *
 * The package exports one entry and picks the build by condition, and webpack resolves `node` even
 * for the bundle that ends up in a Web Worker — so the Node build wins and drags in
 * `onnxruntime-node`, a native `.node` binary no browser bundler can parse. Its subpaths are not
 * exported either, so the browser build cannot simply be named. Resolving the package and stepping
 * across to its sibling is what gets past both.
 */
const require = createRequire(import.meta.url);
const transformersWeb = join(
  dirname(
    require.resolve("@huggingface/transformers", { paths: [require.resolve("@echo/embeddings")] }),
  ),
  "transformers.web.js",
);

/**
 * What this build is called, read from the one file that declares it rather than written down a
 * second time. The desktop bundle's version is echo's version: they are the same application, and a
 * number kept in two places is a number that disagrees with itself.
 */
const version: string = JSON.parse(
  readFileSync(new URL("../desktop/src-tauri/tauri.conf.json", import.meta.url), "utf8"),
).version;

const config: NextConfig = {
  env: { NEXT_PUBLIC_ECHO_VERSION: version },
  /**
   * echo is a client-side app: the database, search and learning all run in the browser, so there is
   * no server to render against. A static export removes the server and hydration mismatches with
   * it, and it is what makes self-hosting a matter of copying a folder.
   */
  output: "export",
  reactStrictMode: true,
  /** Workspace packages ship TypeScript source, so the app compiles them rather than importing builds. */
  transpilePackages: [
    "@echo/core",
    "@echo/db",
    "@echo/embeddings",
    "@echo/learning",
    "@echo/parser",
    "@echo/search",
    "@echo/types",
    "@echo/ui",
  ],
  /**
   * Production builds run through webpack (`next build --webpack`), and the two reasons are both
   * about WebAssembly.
   *
   * Turbopack resolves the browser build of transformers.js correctly, so it does not need the alias
   * below — but its minifier renames the property PGlite's Emscripten module looks up by name to
   * instantiate its own WebAssembly, and the app then starts and cannot open its database
   * (`m.instantiateWasm is not a function`). webpack's minifier leaves it alone.
   *
   * webpack in turn needs the alias, or it follows the `node` condition into `onnxruntime-node` and
   * fails on a native binary. So: webpack for the minifier, the alias for the resolver.
   */
  webpack(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@huggingface/transformers$": transformersWeb,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

export default config;
