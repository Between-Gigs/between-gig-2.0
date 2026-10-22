/*
 * Welcome: sent when someone joins the call sheet on /professionals. Same approved copy as the live
 * email (imagine-os/between-gigs lib/welcome-template.ts), set in the new design. The headline is Peter's
 * handwritten "Your next chapter starts here." (public/email/your-next-chapter.png), the same graphic that
 * opens /storyboard. It sits on a white "paper" panel with no dark-mode class, so the black ink always reads;
 * its alt text carries the words when images are off.
 */
import { button, defaultContext, FONT_UI, image, layout, p, section, spacer, textFooter, type EmailContext, type RenderedEmail } from "./layout";
import { light } from "./tokens";

export interface WelcomeProps {
  storyboardUrl: string;
}

const REASON = "You're receiving this welcome because you joined the Between Gigs call sheet.";

export function welcome({ storyboardUrl }: WelcomeProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const subject = "Your next chapter starts here.";
  const preheader = "Extraordinary Talent. Everyday Solutions. Open the interactive Storyboard.";
  const body = [
    // Paper panel: always white, in every client and theme, because the handwriting is black ink.
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${light.surface}" style="background-color:${light.surface};border-radius:19px 19px 0 0;border-collapse:separate;border-spacing:0">
<tr><td align="center" class="e-pad" style="padding:36px 44px 8px;font-family:${FONT_UI}">
<p style="margin:0 0 14px;font-size:11px;line-height:16px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${light.inkBrand}">Extraordinary Talent. Everyday Solutions.</p>
<img src="${ctx.assetBase}/email/your-next-chapter.png" width="420" height="140" alt="Your next chapter starts here." style="display:block;width:100%;max-width:420px;height:auto;border:0;color:${light.ink};font-family:${FONT_UI};font-size:28px;font-weight:700">
</td></tr></table>`,
    section([
      `<p class="e-brand" style="margin:0 0 12px;font-size:11px;line-height:16px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${light.inkBrand}">An interactive Storyboard · tap to open</p>`,
      image({ src: `${ctx.assetBase}/email/storyboard-opening.jpg`, alt: "A slightly open Between Gigs sketchbook — tap to turn the pages", width: 512, height: 341, href: storyboardUrl }),
      spacer(12),
      button(storyboardUrl, "Open the interactive Storyboard"),
      p("Thank you for getting on the call sheet. We'll send your invitation when professional onboarding opens.", { muted: true, size: 15, mb: 28 }),
    ].join("")),
  ].join("");
  const text = `${subject}

Extraordinary Talent. Everyday Solutions.

Open the Between Gigs interactive Storyboard:
${storyboardUrl}

Thank you for getting on the call sheet. We'll send your invitation when professional onboarding opens.

${textFooter(REASON, ctx.siteUrl)}`;
  return { subject, preheader, html: layout({ title: subject, preheader, body, reason: REASON, ctx }), text };
}
