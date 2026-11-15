/** Deliberately separate from onboarding, welcome and marketing. No recipient props. */
import { SIGN_OFF } from "./config";
import {
  craftHero,
  craftLayout,
  craftP,
  craftPaper,
  craftSignOff,
  craftTitle,
} from "./craft";
import {
  defaultContext,
  textFooter,
  type EmailContext,
  type RenderedEmail,
} from "./layout";
export const DIAGNOSTIC_REASON =
  "You requested this one-time diagnostic to check Between Gigs email delivery.";
export function diagnostic(ctx: EmailContext = defaultContext): RenderedEmail {
  const subject = "[DIAGNOSTIC] Between Gigs email check";
  const preheader =
    "A one-time test of our branding, footer and site-to-email delivery.";
  const copy =
    "This is the diagnostic you requested from the Between Gigs dashboard. Please check the background, logo, text and footer on desktop and phone, and check your Spam folder if needed.";
  const evidence =
    "Provider acceptance does not prove inbox delivery. The dashboard shows the request ID, provider ID and timestamps when available. A delivered event means the receiving mail server accepted the message; only you can confirm where it appeared.";
  const hero = craftHero({
    eyebrow: "Diagnostic email · one-time test",
    inner:
      craftTitle(["Email check"]) +
      craftP("Our background. Our brand. A real delivery check."),
    ctx,
  });
  // Keep the real wallpaper visible as an image: the current backend forbids background attributes and URL placeholders in CSS.
  // This diagnostic does not relax that sanitizer or depend on the gated marketing-template changes.
  const safeHero = hero
    // This image strip is the diagnostic wallpaper in every client, including classic Outlook.
    .replace("<!--[if !mso]><!-->", "")
    .replace("<!--<![endif]-->", "")
    .replace(/ background="[^"]*"/g, "")
    .replace(/background-image:url\('[^']*'\);/g, "")
    .replace(
      'class="e-k-strip" style="display:none;max-height:0;overflow:hidden;mso-hide:all"',
      'style="display:block"',
    );
  const body =
    safeHero +
    craftPaper(
      craftP(copy, { mb: 18 }) +
        craftP(evidence, { mb: 18 }) +
        craftP(
          "This test does not create an account, invite anyone or change your marketing preferences.",
        ) +
        craftSignOff(SIGN_OFF),
    );
  return {
    subject,
    preheader,
    html: craftLayout({
      title: subject,
      preheader,
      body,
      reason: DIAGNOSTIC_REASON,
      ctx,
      lightOnly: true,
      center: true,
    }),
    text: `${subject}\n\n${copy}\n\n${evidence}\n\nThis test does not create an account, invite anyone or change your marketing preferences.\n\n${SIGN_OFF}\n\n${textFooter(DIAGNOSTIC_REASON, ctx.siteUrl)}`,
  };
}
