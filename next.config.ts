import type { NextConfig } from "next";

/**
 * Static export, so the app previews on GitHub Pages. There is no server in this milestone:
 * every read and write goes through the client-side sample data layer in lib/data/.
 * NEXT_PUBLIC_BASE_PATH is "/between-gig-2.0" on Pages and empty locally.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
