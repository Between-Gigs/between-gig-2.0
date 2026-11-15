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
export const DIAGNOSTIC_DARK_INK = "#f5f5f5";
export const DIAGNOSTIC_REASON =
  "You requested this one-time diagnostic to check Between Gigs email delivery.";
/** Scoped to this diagnostic: shared invitation/welcome templates remain byte-for-byte unchanged.
 * Neutral text gives forced-inversion clients a simpler high-contrast pair. Clients supporting
 * theme CSS get an explicit dark palette. A cream gradient behind the transparent original logo
 * is intended to resist HTML background recoloring; actual Gmail behavior still needs a client check.
 */
function diagnosticAppearance(html: string): string {
  const dark = `
.e-diagnostic,.e-diagnostic .e-outer{background-color:#181818!important}
.e-diagnostic table[bgcolor],.e-diagnostic .e-card{background-color:#242424!important;border-color:#555555!important}
.e-diagnostic p,.e-diagnostic h1,.e-diagnostic a{color:${DIAGNOSTIC_DARK_INK}!important}
`;
  const outlook = dark.trim().split("\n").map((rule) => {
    const [selectors, declarations] = rule.split("{");
    return `${selectors.split(",").map((selector) => `[data-ogsc] ${selector}`).join(",")}{${declarations}`;
  }).join("\n");
  return html
    // Inline mobile-safe dimensions survive clients that remove the entire stylesheet.
    .replace('width:600px;max-width:600px', 'width:100%;max-width:600px')
    .replace('padding:88px 60px', 'padding:32px 20px')
    .replace('padding:44px 36px 34px', 'padding:34px 20px 28px')
    .replace('padding:40px 56px 36px', 'padding:32px 22px')
    .replace('font-size:46px;line-height:48px', 'font-size:36px;line-height:40px')
    .replace('white-space:nowrap', 'white-space:normal')
    .replace('class="e-body"', 'class="e-body e-diagnostic"')
    .replace(/color:#(?:0f3d29|4a5249|516253|086c42|0e1a13)(?=[;"}])/g, "color:#242424")
    .replace(/(<img src="[^"]*\/email\/between-gigs-wide-on-light\.png"[^>]*>)/, '<div class="e-d-logo" style="display:inline-block;padding:12px;background-color:#fbf8f2;background-image:linear-gradient(#fbf8f2,#fbf8f2);border-radius:2px">$1</div>')
    .replace("</style>", `@media (prefers-color-scheme:dark){${dark}}\n${outlook}\n</style>`);
}
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
    html: diagnosticAppearance(craftLayout({
      title: subject,
      preheader,
      body,
      reason: DIAGNOSTIC_REASON,
      ctx,
      lightOnly: false,
      center: true,
    })),
    text: `${subject}\n\n${copy}\n\n${evidence}\n\nThis test does not create an account, invite anyone or change your marketing preferences.\n\n${SIGN_OFF}\n\n${textFooter(DIAGNOSTIC_REASON, ctx.siteUrl)}`,
  };
}
