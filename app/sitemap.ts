import type { MetadataRoute } from "next";
import { abs } from "@/lib/og";
import pages from "@/lib/og-pages.json";

export const dynamic = "force-static";

/** The public pages (marked `public` in og-pages.json), the same list that may be indexed on production. */
export default function sitemap(): MetadataRoute.Sitemap {
  return Object.values(pages as Record<string, { path: string; public?: boolean }>)
    .filter((p) => p.public)
    .map((p) => ({ url: abs(p.path), changeFrequency: "weekly", priority: p.path === "/" ? 1 : 0.7 }));
}
