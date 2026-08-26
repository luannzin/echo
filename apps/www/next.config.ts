import type { NextConfig } from "next";

/** The site is static text and vector art: no server, so it deploys as a folder like the app does. */
const config: NextConfig = {
  output: "export",
  reactStrictMode: true,
};

export default config;
