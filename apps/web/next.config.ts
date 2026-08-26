import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { NextConfig } from "next";

/**
 * transformers.js on disk, by path rather than by name.
 *
 * The package exports one entry and picks the build by condition, and Next resolves `node` even for
 * the bundle that ends up in a Web Worker — so the Node build wins and drags in `onnxruntime-node`,
 * a native `.node` binary no browser bundler can parse. Its subpaths are not exported either, so the
 * browser build cannot simply be named. Resolving the package and stepping across to its sibling is
 * what gets past both.
 */
const require = createRequire(import.meta.url);
const transformersWeb = join(
  dirname(
    require.resolve("@huggingface/transformers", { paths: [require.resolve("@echo/embeddings")] }),
  ),
  "transformers.web.js",
);

const config: NextConfig = {
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
  /** Production builds run through webpack (`next build --webpack`); see `transformersWeb` above. */
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
