/*
 * Confirmation after a Gigster submits their profile for review: "We've got your profile." (Flow p6, Peter).
 * Same craft look as the invite (./craft). It repeats that the profile stays private during review, says when to
 * expect to hear (config REVIEW_TIME), mentions vetting only once config VETTING_NOTE is set, and signs off as the
 * team (config SIGN_OFF). One button ("View my profile"); editing is a text link.
 */
import { REVIEW_TIME, SIGN_OFF, VETTING_NOTE } from "./config";
import { craftButton, craftH2, craftHero, craftLayout, craftLink, craftP, craftPaper, craftRule, craftSignOff, craftTitle, k, SANS } from "./craft";
import { defaultContext, esc, textFooter, type EmailContext, type RenderedEmail } from "./layout";

export interface ProfileSubmittedProps {
  firstName: string;
  /**
   * The Gigster's own profile page, {links}/profile/ (signed in): a submitted profile isn't public yet, so never
   * /p/<handle>. Company OS's copy of this template (its recipe) uses the same link.
   */
  profileUrl: string;
  editUrl: string;
}

const REASON = "You're receiving this because you submitted a profile on Between Gigs.";

export const PROFILE_SUBMITTED_COPY = {
  eyebrow: "Profile received",
  title: ["We've got", "your profile."],
  cta: "View my profile",
  edit: "Edit my profile",
  nextTitle: "What happens next?",
  next: [
    "Our team will review your profile and may reach out with ideas to help your services stand out.",
    `Your profile stays private during review. You'll hear from us ${REVIEW_TIME}.`,
    ...(VETTING_NOTE ? [VETTING_NOTE] : []),
    "We'll keep you posted as we get ready to introduce your work to the public and connect you with new opportunities.",
  ],
  editNote: "Spotted something to change? You can edit your profile any time; edits go back to review.",
} as const;

export function profileSubmitted({ firstName, profileUrl, editUrl }: ProfileSubmittedProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const c = PROFILE_SUBMITTED_COPY;
  const name = firstName.trim();
  const thanks = `Thanks${name ? `, ${name}` : ""}. We're glad you're part of our founding Gigster community.`;
  const subject = `We've got your profile${name ? `, ${name}` : ""}`;
  const preheader = `Your profile stays private while we review it. You'll hear from us ${REVIEW_TIME}.`;
  const card = [
    craftTitle(c.title),
    `<p style="margin:0 auto 26px;max-width:420px;font-family:${SANS};font-size:17px;line-height:26px;color:${k.ink}">${esc(thanks)}</p>`,
    craftButton(profileUrl, c.cta),
    `<p style="margin:16px 0 0;font-family:${SANS};font-size:15px;line-height:22px">${craftLink(editUrl, c.edit)}</p>`,
  ].join("\n");
  const next = [
    craftH2(c.nextTitle),
    ...c.next.map((t) => craftP(esc(t), { size: 15, mb: 12 })),
    craftRule("18px auto 16px", "64px"),
    craftP(esc(c.editNote), { size: 13 }),
    craftSignOff(SIGN_OFF),
  ].join("\n");
  const body = craftHero({ eyebrow: c.eyebrow, inner: card, ctx }) + craftPaper(`<div style="text-align:center">${next}</div>`);
  const text = `${subject}

${c.eyebrow.toUpperCase()}

${c.title.join(" ")}

${thanks}

${c.cta}:
${profileUrl}

${c.edit}:
${editUrl}

${c.nextTitle.toUpperCase()}
${c.next.join("\n\n")}

${c.editNote}

${SIGN_OFF}

${textFooter(REASON, ctx.siteUrl)}`;
  return { subject, preheader, html: craftLayout({ title: subject, preheader, body, reason: REASON, ctx }), text };
}
