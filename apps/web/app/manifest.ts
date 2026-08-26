import type { MetadataRoute } from "next";

/** The app is a static export, so the manifest is a file rather than a route that runs. */
export const dynamic = "force-static";

/**
 * Installable as an application because that is what it is: everything echo does happens on this
 * device, so there is nothing for a browser tab to add.
 */
const manifest = (): MetadataRoute.Manifest => ({
  name: "echo — the note taker that learns with you",
  short_name: "echo",
  description:
    "Open source, no-AI, local-first note taking. Semantic search, automatic organization and adaptive learning, all on your own machine.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "any",
  background_color: "#0a0a0b",
  theme_color: "#0a0a0b",
  categories: ["productivity", "utilities"],
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
});

export default manifest;
