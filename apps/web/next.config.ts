import type { NextConfig } from "next";

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
};

export default config;
