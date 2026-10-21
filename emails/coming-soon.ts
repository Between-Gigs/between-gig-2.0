/*
 * Coming soon: the acknowledgement for either Storyboard form (talent or buyer). Same approved copy as the
 * live email (imagine-os/between-gigs lib/coming-soon-template.ts), signed Patti & Peter.
 */
import { defaultContext, hero, image, layout, p, section, signature, textFooter, type EmailContext, type RenderedEmail } from "./layout";

export interface ComingSoonProps {
  /** talent or buyer. The copy is the same for both today; kept so the two can diverge later. */
  kind: string;
}

const REASON = "You're receiving this confirmation because you shared your skills or a project with Between Gigs.";

export function comingSoon(_props: ComingSoonProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const subject = "Thank you. The next chapter is coming.";
  const preheader = "We've received your interest and will let you know as soon as we're ready.";
  const body = [
    hero({ eyebrow: "Coming soon", title: "Extraordinary talent.", accent: "Everyday possibilities." }),
    section([
      image({ src: `${ctx.assetBase}/email/assemble-the-crew.jpg`, alt: "Entertainment professionals bringing people together", width: 512, height: 341 }),
    ].join(""), "32px 44px 0"),
    section([
      p("Thank you for your interest in Between Gigs."),
      p("We're putting the finishing touches on Between Gigs. We've received your interest and will let you know as soon as we're ready."),
      p("Until then, thank you for being part of what comes next.", { mb: 4 }),
      signature(["Patti & Peter"]),
      p("", { mb: 16 }),
    ].join(""), "28px 44px 16px"),
  ].join("");
  const text = `${subject}

Thank you for your interest in Between Gigs.

Extraordinary talent. Everyday possibilities.

We're putting the finishing touches on Between Gigs. We've received your interest and will let you know as soon as we're ready.

Until then, thank you for being part of what comes next.

Patti & Peter

${textFooter(REASON, ctx.siteUrl)}`;
  return { subject, preheader, html: layout({ title: subject, preheader, body, reason: REASON, ctx }), text };
}
