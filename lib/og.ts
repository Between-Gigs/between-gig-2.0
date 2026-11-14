/*
 * Social share images and SEO: when a link is pasted into WhatsApp, Slack, iMessage or email, the preview shows the
 * page itself. Each page's 1200×630 image lives in public/og/<name>.jpg, made by `node scripts/og-images.mjs` from the
 * list in og-pages.json (a plain, light screenshot of the page, the style the client liked, 14 Nov 2026). URLs are
 * absolute, as the crawlers need. Every page also gets a canonical URL; only public pages on production are indexed.
 */
import type { Metadata } from "next";
import { basePath } from "@/lib/site";
import pages from "./og-pages.json";

export type OgName = keyof typeof pages;
type OgPage = { path: string; title: string; description: string; shareTitle?: string; public?: boolean };

/** Where the built site is served: GitHub Pages for the preview (it has a base path), the domain otherwise. */
export const siteOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? (basePath ? "https://between-gigs.github.io" : "https://between-gigs.com");
export const abs = (path: string) => `${siteOrigin}${basePath}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Search engines may index only production (the build with Clerk's live key). The GitHub Pages preview and the test
 * environment stay noindex everywhere, so the sample data never shows up in search.
 */
export const indexable = !basePath && (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").startsWith("pk_live_");

/** Title, description, canonical URL, robots and share image for a page, by its name in og-pages.json. */
export function share(name: OgName, overrides: { title?: string; description?: string; path?: string } = {}): Metadata {
  const p: OgPage = pages[name];
  const title = overrides.title ?? p.title;
  const description = overrides.description ?? p.description;
  // The card's headline: the page's own share line when it has one (e.g. "Extraordinary Talent. Everyday Help.").
  const shareTitle = (!overrides.title && p.shareTitle) || `${title} · Between Gigs`;
  const url = abs((overrides.path ?? p.path).split("?")[0]);
  const image = { url: abs(`og/${name}.jpg`), width: 1200, height: 630, alt: shareTitle };
  return {
    description,
    alternates: { canonical: url },
    ...(p.public && indexable ? { robots: { index: true, follow: true } } : {}),
    openGraph: { type: "website", siteName: "Between Gigs", locale: "en_US", title: shareTitle, description, url, images: [image] },
    twitter: { card: "summary_large_image", title: shareTitle, description, images: [image.url] },
  };
}
