/* Confirmation after a Gigster submits their profile for review. */
import { button, defaultContext, h2, hero, layout, link, p, section, signature, steps, textFooter, type EmailContext, type RenderedEmail } from "./layout";

export interface ProfileSubmittedProps {
  firstName: string;
  profileUrl: string;
  editUrl: string;
}

const REASON = "You're receiving this because you submitted a profile on Between Gigs.";
const NEXT: [string, string][] = [
  ["We review it", "Our team reads every profile before it goes live."],
  ["We're in touch", "We'll email you when it's approved, or if we suggest a change."],
  ["You go live", "Once approved, clients across Los Angeles can find you."],
];

export function profileSubmitted({ firstName, profileUrl, editUrl }: ProfileSubmittedProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const name = firstName.trim() || "there";
  const subject = `We've got your profile, ${name}`;
  const preheader = "Thank you for submitting. Here's what happens next.";
  const body = [
    hero({ eyebrow: "Profile submitted", title: `You're in the queue,`, accent: `${name}.` }),
    section([
      p("Thank you for submitting your Between Gigs profile. Your skills don't stop when the cameras do, and we can't wait to help clients find them."),
      button(profileUrl, "See my profile"),
    ].join("")),
    section([
      h2("What happens next"),
      steps(NEXT),
      p(`Spotted something to change? You can ${link(editUrl, "edit your profile")} any time; edits go back to review.`, { muted: true, size: 15 }),
      signature(),
      p("", { mb: 16 }),
    ].join(""), "16px 44px 16px"),
  ].join("");
  const text = `${subject}

You're in the queue, ${name}.

Thank you for submitting your Between Gigs profile. Your skills don't stop when the cameras do, and we can't wait to help clients find them.

See my profile:
${profileUrl}

WHAT HAPPENS NEXT
${NEXT.map(([t, d], i) => `0${i + 1} ${t}: ${d}`).join("\n")}

Spotted something to change? Edit your profile any time; edits go back to review:
${editUrl}

Patti & Peter
Founders, Between Gigs

${textFooter(REASON, ctx.siteUrl)}`;
  return { subject, preheader, html: layout({ title: subject, preheader, body, reason: REASON, ctx }), text };
}

