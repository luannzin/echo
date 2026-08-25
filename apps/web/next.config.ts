import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@echo/ui", "@echo/core", "@echo/types"],
};

export default config;
