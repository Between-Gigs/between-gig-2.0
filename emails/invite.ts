/* The canonical Stage 2 invitation. Browser previews and send-time HTML use this one source. */
const INVITE_SIGN_OFF = "The Between Gigs Team";
import { craftButton, craftLayout, craftP, craftPaper, craftSignOff, k } from "./craft";
import { invitationHero } from "./invite-hero";
import { invitationAppearance } from "./invite-appearance";
import { defaultContext, esc, textFooter, type EmailContext, type RenderedEmail } from "./layout";

export interface InviteProps {
  /** The personal "Create your profile" link: /join?invite=<token>. */
  inviteUrl: string;
  email: string;
  /** Sending transport supplies its own placeholder; default keeps Resend Broadcast semantics. */
  unsubscribeUrl?: string;
}

export const INVITE_REASON = "You’re receiving this message because you requested to join the Call Sheet.";
export const INVITE_UNSUBSCRIBE = "{{{RESEND_UNSUBSCRIBE_URL}}}";

export const INVITE_COPY = {
  subject: "You're invited to Between Gigs",
  preheader: "Welcome to Stage 2: Building our Gigster community!",
  eyebrow: "You're invited",
  title: ["Your craft.", "More possibilities."],
  lead: "Your skills have value beyond the set.\nLet us help you put them to work.",
  opening: "We’ve been hard at work behind the scenes, and we’re excited to take the next step with you!",
  stage: "Welcome to Stage 2: Building our Gigster community!",
  introduction: "Now it’s time to introduce yourself! Create your profile by sharing your professional experience, the skills and services you offer, and where you're available to work.",
  nextTitle: "What happens next?",
  next: "Once you’ve signed up, you’ll be part of our founding Gigster community. We’ll keep you updated as we prepare to introduce your services to the public and begin connecting you with new opportunities in the coming weeks.",
  ready: "Ready to get started?",
  cta: "Create your profile",
  closing: "We’re thrilled to have you on this journey with us!",
} as const;

export function invite({ inviteUrl, unsubscribeUrl = INVITE_UNSUBSCRIBE }: InviteProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const c = INVITE_COPY;
  const details = [
    craftP(esc(c.opening), { size: 16, mb: 20, color: k.ink }),
    craftP(`<strong>${esc(c.stage)}</strong>`, { size: 16, mb: 20, color: k.ink }),
    craftP(esc(c.introduction), { size: 16, mb: 20, color: k.ink }),
    craftP(`<strong>${esc(c.nextTitle)}</strong> ${esc(c.next)}`, { size: 16, mb: 24, color: k.ink }),
    // The close is centred on the button (Anowar, 14 Nov 2026): the question, the button, the thanks and the sign-off.
    craftP(`<strong>${esc(c.ready)}</strong>`, { size: 16, mb: 16, color: k.ink, center: true }),
    craftButton(inviteUrl, c.cta).replace("<table ", '<table class="e-invite-html-cta" '),
    `<div style="padding-top:24px">${craftP(esc(c.closing), { size: 16, color: k.ink, center: true })}</div>`,
    craftSignOff(INVITE_SIGN_OFF, 22, true, true),
  ].join("\n");
  const body = invitationHero(inviteUrl, ctx) + craftPaper(details).replace("<table ", '<table class="e-invite-paper" ');
  const text = `${c.subject}\n\n${c.eyebrow.toUpperCase()}\n\n${c.title.join(" ")}\n\n${c.lead}\n\n${c.cta.toUpperCase()}:\n${inviteUrl}\n\n${c.opening}\n\n${c.stage}\n\n${c.introduction}\n\n${c.nextTitle} ${c.next}\n\n${c.ready}\n\n${c.cta.toUpperCase()}:\n${inviteUrl}\n\n${c.closing}\n\n${INVITE_SIGN_OFF}\n\n${textFooter(INVITE_REASON, ctx.siteUrl, unsubscribeUrl)}`;
  return {
    subject: c.subject,
    preheader: c.preheader,
    text,
    html: invitationAppearance(craftLayout({ title: c.subject, preheader: c.preheader, body, reason: INVITE_REASON, ctx, unsubscribe: unsubscribeUrl, lightOnly: true, center: true })),
  };
}
