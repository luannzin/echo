import type { NextConfig } from "next";

const config: NextConfig = {
  /**
   * echo is a client-side app: PGlite, search and learning all run in the browser, so there is no
   * server to render against. A static export removes the server and hydration mismatches with it,
   * and it is what makes self-hosting a matter of copying a folder.
   */
  output: "export",
  reactStrictMode: true,
  transpilePackages: ["@echo/ui", "@echo/core", "@echo/types"],
};

export default config;
