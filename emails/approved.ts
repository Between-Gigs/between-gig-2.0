/* Sent when an owner approves a submitted profile. Copy: proposal, in Patti & Peter's voice. */
import { button, defaultContext, h2, hero, layout, link, p, section, signature, steps, textFooter, type EmailContext, type RenderedEmail } from "./layout";

export interface ApprovedProps {
  firstName: string;
  /** The public page, /p/[slug]. */
  profileUrl: string;
  editUrl: string;
}

const REASON = "You're receiving this because your Between Gigs profile was approved.";
const TIPS: [string, string][] = [
  ["Keep availability fresh", "Confirm your dates each month so clients know when to ask."],
  ["Production comes first", "Pause your availability when the call comes, and return when you're ready."],
  ["Share your page", "Send your profile link to people who already know your work."],
];

export function approved({ firstName, profileUrl, editUrl }: ApprovedProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const name = firstName.trim() || "there";
  const subject = `You're on the call sheet, ${name}. Your profile is live.`;
  const preheader = "Your Between Gigs profile has been approved. Clients across Los Angeles can now find you.";
  const body = [
    hero({ eyebrow: "Profile approved", title: "Your profile is live,", accent: `${name}.` }),
    section([
      p("Good news: we've reviewed your profile and it's approved. Clients across Los Angeles can now find your craft, your services and your story."),
      button(profileUrl, "See my public profile"),
    ].join("")),
    section([
      h2("A few things that help"),
      steps(TIPS),
      p(`Want to change something? ${link(editUrl, "Edit your profile")} any time. Changes go to a quick review before they appear.`, { muted: true, size: 15 }),
      signature(),
      p("", { mb: 16 }),
    ].join(""), "16px 44px 16px"),
  ].join("");
  const text = `${subject}

Good news: we've reviewed your profile and it's approved. Clients across Los Angeles can now find your craft, your services and your story.

See my public profile:
${profileUrl}

A FEW THINGS THAT HELP
${TIPS.map(([t, d], i) => `0${i + 1} ${t}: ${d}`).join("\n")}

Want to change something? Edit your profile any time. Changes go to a quick review before they appear:
${editUrl}

Patti & Peter
Founders, Between Gigs

${textFooter(REASON, ctx.siteUrl)}`;
  return { subject, preheader, html: layout({ title: subject, preheader, body, reason: REASON, ctx }), text };
}
