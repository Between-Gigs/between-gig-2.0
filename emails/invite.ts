/* The canonical Stage 2 invitation. Browser previews and send-time HTML use this one source. */
import { SIGN_OFF } from "./config";
import { craftButton, craftHero, craftLayout, craftP, craftPaper, craftSignOff, craftTitle, k, SANS } from "./craft";
import { defaultContext, esc, textFooter, type EmailContext, type RenderedEmail } from "./layout";

export interface InviteProps {
  /** The personal "Create your profile" link: /join?invite=<token>. */
  inviteUrl: string;
  email: string;
}

export const INVITE_REASON = "You’re receiving this message because you requested to join the Call Sheet.";
export const INVITE_UNSUBSCRIBE = "{{{RESEND_UNSUBSCRIBE_URL}}}";

export const INVITE_COPY = {
  subject: "You're invited to Between Gigs",
  preheader: "Welcome to Stage 2: Building our Gigster community!",
  eyebrow: "You're invited",
  title: ["Your craft.", "More possibilities."],
  lead: "Your skills have value beyond the set. Let us help you put them to work.",
  opening: "We’ve been hard at work behind the scenes, and we’re excited to take the next step with you!",
  stage: "Welcome to Stage 2: Building our Gigster community!",
  introduction: "Now it’s time to introduce yourself! Create your profile by sharing your professional experience, the skills and services you offer, and where you're available to work.",
  nextTitle: "What happens next?",
  next: "Once you’ve signed up, you’ll be part of our founding Gigster community. We’ll keep you updated as we prepare to introduce your services to the public and begin connecting you with new opportunities.",
  ready: "Ready to get started?",
  cta: "Create your profile",
  closing: "We’re thrilled to have you on this journey with us!",
} as const;

export function invite({ inviteUrl }: InviteProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const c = INVITE_COPY;
  const hero = [
    craftTitle(c.title).replace('class="e-k-h1"', 'class="e-k-h1 e-invite-title"'),
    `<p class="e-invite-lead" style="margin:0 auto;max-width:420px;font-family:${SANS};font-size:17px;line-height:26px;color:${k.ink}">${esc(c.lead)}</p>`,
    `<div class="e-invite-action" style="padding-top:24px">${craftButton(inviteUrl, c.cta, { hero: true })}</div>`,
  ].join("\n");
  const details = [
    craftP(esc(c.opening), { size: 16, mb: 20, color: k.ink }),
    craftP(`<strong>${esc(c.stage)}</strong>`, { size: 16, mb: 20, color: k.ink }),
    craftP(esc(c.introduction), { size: 16, mb: 20, color: k.ink }),
    craftP(`<strong>${esc(c.nextTitle)}</strong> ${esc(c.next)}`, { size: 16, mb: 24, color: k.ink }),
    // The close is centred on the button (Anowar, 14 Nov 2026): the question, the button, the thanks and the sign-off.
    craftP(`<strong>${esc(c.ready)}</strong>`, { size: 16, mb: 16, color: k.ink, center: true }),
    craftButton(inviteUrl, c.cta),
    `<div style="padding-top:24px">${craftP(esc(c.closing), { size: 16, color: k.ink, center: true })}</div>`,
    craftSignOff(SIGN_OFF, 22, true),
  ].join("\n");
  const body = craftHero({ eyebrow: c.eyebrow, inner: hero, ctx, openPaper: true }) + craftPaper(details);
  const text = `${c.subject}\n\n${c.eyebrow.toUpperCase()}\n\n${c.title.join(" ")}\n\n${c.lead}\n\n${c.cta.toUpperCase()}:\n${inviteUrl}\n\n${c.opening}\n\n${c.stage}\n\n${c.introduction}\n\n${c.nextTitle} ${c.next}\n\n${c.ready}\n\n${c.cta.toUpperCase()}:\n${inviteUrl}\n\n${c.closing}\n\n${SIGN_OFF}\n\n${textFooter(INVITE_REASON, ctx.siteUrl, INVITE_UNSUBSCRIBE)}`;
  return {
    subject: c.subject,
    preheader: c.preheader,
    text,
    html: craftLayout({ title: c.subject, preheader: c.preheader, body, reason: INVITE_REASON, ctx, unsubscribe: INVITE_UNSUBSCRIBE, lightOnly: true, center: true }),
  };
}
