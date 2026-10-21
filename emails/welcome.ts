/*
 * Welcome: sent when someone joins the call sheet on /professionals. Same approved copy as the live
 * email (imagine-os/between-gigs lib/welcome-template.ts), set in the new design. The headline that was
 * an image ("your-next-chapter.png") is live text now, so it reads without images and in dark mode.
 */
import { button, defaultContext, hero, image, layout, p, section, spacer, textFooter, type EmailContext, type RenderedEmail } from "./layout";
import { light } from "./tokens";

export interface WelcomeProps {
  storyboardUrl: string;
}

const REASON = "You're receiving this welcome because you joined the Between Gigs call sheet.";

export function welcome({ storyboardUrl }: WelcomeProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const subject = "Your next chapter starts here.";
  const preheader = "Extraordinary Talent. Everyday Solutions. Open the interactive Storyboard.";
  const body = [
    hero({ eyebrow: "Extraordinary Talent. Everyday Solutions.", title: "Your next chapter", accent: "starts here." }),
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
