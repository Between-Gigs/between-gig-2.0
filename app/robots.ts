import type { MetadataRoute } from "next";
import { abs, indexable } from "@/lib/og";

export const dynamic = "force-static";

/** Production: crawl the public pages, never the signed-in or internal ones. Preview and test: crawl nothing. */
export default function robots(): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/owners/", "/profile/", "/hub/", "/preview/", "/preview-access/", "/workspace/", "/studio/", "/emails/", "/proposals/", "/versions/", "/artifacts/", "/api/", "/join/", "/login/"] },
    sitemap: abs("/sitemap.xml"),
  };
}
