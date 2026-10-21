/*
 * Invite to the ~500 waitlist sign-ups: professional onboarding is open, with a personal link.
 * Copy: proposal in Patti & Peter's voice, reusing approved phrases from the live site and the
 * welcome / coming-soon emails ("Your next chapter starts here", "Get on the call sheet").
 */
import { button, defaultContext, esc, hero, layout, link, p, section, signature, spacer, steps, textFooter, h2, type EmailContext, type RenderedEmail } from "./layout";

export interface InviteProps {
  /** The personal "Create your profile" link: /join?invite=<token>. */
  inviteUrl: string;
  email: string;
}

const REASON = "You're receiving this because you joined the Between Gigs call sheet.";
const NEED: [string, string][] = [
  ["About you", "A clear photo, your years in the business, your IMDb page and a credit or two."],
  ["Skills & services", "What you do on set, and what you'd offer between gigs."],
  ["Where & when", "The parts of Los Angeles you'll work in, and when you're free this month."],
  ["Your story", "A few lines in your own words. This is what clients read first."],
];

export function invite({ inviteUrl, email }: InviteProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const subject = "Professional onboarding is open";
  const preheader = "You're on the call sheet. Create your Between Gigs profile; it takes about 10 minutes.";
  const body = [
    hero({ eyebrow: "Los Angeles Call Sheet", title: "Your next chapter", accent: "starts here." }),
    section([
      p("Thank you for getting on the call sheet. Professional onboarding is now open, and your place is saved."),
      p("You've spent your career mastering your craft. Between Gigs puts those skills to work beyond the set: on your terms, at your rates and around your production schedule.", { muted: true }),
      button(inviteUrl, "Create your profile"),
      p(`This link is just for you (${esc(email)}) and works for 30 days.`, { muted: true, size: 13, mb: 8 }),
    ].join("")),
    section([
      h2("What you'll need"),
      steps(NEED),
      p("Your progress saves as you go, so you can stop and come back any time. When you submit, we review every profile before it goes live.", { muted: true, size: 15 }),
      p(`Production comes first. Pause your availability when the call comes, and return when you're ready.`, { muted: true, size: 15 }),
      signature(),
      spacer(16),
      p(`Button not working? Paste this link into your browser:<br>${link(inviteUrl, inviteUrl)}`, { muted: true, size: 13, mb: 28 }),
    ].join(""), "16px 44px 8px"),
  ].join("");

  const text = `${subject}

Your next chapter starts here.

Thank you for getting on the call sheet. Professional onboarding is now open, and your place is saved.

You've spent your career mastering your craft. Between Gigs puts those skills to work beyond the set: on your terms, at your rates and around your production schedule.

Create your profile:
${inviteUrl}

This link is just for you (${email}) and works for 30 days.

WHAT YOU'LL NEED
${NEED.map(([t, d], i) => `0${i + 1} ${t}: ${d}`).join("\n")}

Your progress saves as you go, so you can stop and come back any time. When you submit, we review every profile before it goes live.

Production comes first. Pause your availability when the call comes, and return when you're ready.

Patti & Peter
Founders, Between Gigs

${textFooter(REASON, ctx.siteUrl)}`;

  return { subject, preheader, html: layout({ title: subject, preheader, body, reason: REASON, ctx }), text };
}
