import { renderEmail, type EmailContext } from "@/emails";
import type { EmailTemplate } from "@/lib/data";
import { basePath } from "@/lib/site";

export type PreviewScheme = "light" | "dark";

/** Logo PNGs from this deployment (public/email), so the preview never depends on production assets. */
export function previewContext(): EmailContext {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return { assetBase: `${origin}${basePath}`, siteUrl: "https://between-gigs.com" };
}

/**
 * Forces a color scheme inside the preview iframe: the email's own dark rules sit in a
 * prefers-color-scheme media query, which follows the OS, not the preview toggle.
 */
export function forceScheme(html: string, scheme: PreviewScheme) {
  return html.replace("@media (prefers-color-scheme:dark){", scheme === "dark" ? "@media all{" : "@media not all{");
}

export function renderPreview(name: EmailTemplate, props: Record<string, string> | undefined, scheme: PreviewScheme) {
  const email = renderEmail(name, props, previewContext());
  return { ...email, html: forceScheme(email.html, scheme) };
}
