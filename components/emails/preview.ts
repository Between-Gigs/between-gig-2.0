import { INVITE_UNSUBSCRIBE } from "@/emails/invite";
import { renderEmail, type EmailContext } from "@/emails";
import type { EmailTemplate } from "@/lib/data";
import { basePath } from "@/lib/site";
import { DEMO_TOKENS } from "@/lib/data/fields";

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

/** The sample invite opens this site's own demo invite, so a walkthrough can start in the inbox. */
export function sampleProps(name: EmailTemplate): Record<string, string> | undefined {
  if (name !== "invite" || typeof window === "undefined") return undefined;
  return { inviteUrl: `${window.location.origin}${basePath}/join/?invite=${DEMO_TOKENS.valid}`, email: "riley.park@example.com" };
}

export function renderPreview(name: EmailTemplate, props: Record<string, string> | undefined, scheme: PreviewScheme) {
  const email = renderEmail(name, props ?? sampleProps(name), previewContext());
  // Resend resolves this macro for each recipient at send time. A sample never acts on a real subscription.
  const html = name === "invite" ? email.html.replace(/<a data-email-unsubscribe([^>]*?) href="(?:\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}|\{\{links\.unsubscribe\}\})"([^>]*)>Unsubscribe<\/a>/,
    '<span data-email-unsubscribe aria-disabled="true"$1$2>Unsubscribe</span>') : email.html;
  const text = name === "invite" ? email.text.replace(INVITE_UNSUBSCRIBE, "Available in the delivered email only; inactive in this sample.") : email.text;
  // Links leave the preview frame and open in the page itself.
  return { ...email, text, html: forceScheme(html, scheme).replace("<head>", '<head><base target="_parent">') };
}
