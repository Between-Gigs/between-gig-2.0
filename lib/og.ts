/*
 * Social share images: when a link is pasted into WhatsApp, Slack, iMessage or email, the preview shows the page
 * itself. Each page's 1200×630 image lives in public/og/<name>.jpg, made by `node scripts/og-images.mjs` from the
 * list in og-pages.json (a real screenshot of the page in a branded frame). URLs are absolute, as the crawlers need.
 */
import type { Metadata } from "next";
import { basePath } from "@/lib/site";
import pages from "./og-pages.json";

export type OgName = keyof typeof pages;

/** Where the built site is served: GitHub Pages for the preview (it has a base path), the domain otherwise. */
export const siteOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? (basePath ? "https://between-gigs.github.io" : "https://between-gigs.com");
const abs = (path: string) => `${siteOrigin}${basePath}${path.startsWith("/") ? path : `/${path}`}`;

/** Title, description and share image for a page, by its name in og-pages.json. */
export function share(name: OgName, overrides: { title?: string; description?: string } = {}): Metadata {
  const p = pages[name];
  const title = overrides.title ?? p.title;
  const description = overrides.description ?? p.description;
  const image = { url: abs(`og/${name}.jpg`), width: 1200, height: 630, alt: `${title} · Between Gigs` };
  return {
    description,
    openGraph: { type: "website", siteName: "Between Gigs", title: `${title} · Between Gigs`, description, url: abs(p.path), images: [image] },
    twitter: { card: "summary_large_image", title: `${title} · Between Gigs`, description, images: [image.url] },
  };
}
