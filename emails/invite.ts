/*
 * Invite to the ~500 waitlist sign-ups: their personal link to create a profile (Stage 2).
 * Design: the client's confirmed invite, "Your craft. More possibilities." (Justin, 4 Nov 2026: "this is the email we
 * will use"; Flow p1), in the shared craft look (./craft): the flat-lay frames a cream card with the logo, "You're
 * invited", the serif headline, the opportunity in Peter's words, one dark-green button and what joining means. Below
 * the frame, on the same warm paper: what they'll need, what happens after they submit, the sign-off and a closing
 * "Let the journey begin…" block with their personal link.
 * One button only (the client, 13 Nov 2026: one clear "Create your profile", straight into onboarding); anything else
 * is a text link. The plain-text version follows the same order and words.
 */
import { SIGN_OFF } from "./config";
import { craftButton, craftH2, craftHero, craftLayout, craftP, craftPaper, craftSignOff, craftTitle, k, SANS, SERIF, T } from "./craft";
import { defaultContext, esc, textFooter, type EmailContext, type RenderedEmail } from "./layout";

export interface InviteProps {
  /** The personal "Create your profile" link: /join?invite=<token>. */
  inviteUrl: string;
  email: string;
}

const REASON = "You're receiving this because you joined the Between Gigs call sheet.";

/** The locked text. */
export const INVITE_COPY = {
  subject: "You're invited to Between Gigs",
  preheader: "Become a founding Gigster: create your profile in about 10 minutes. It saves as you go.",
  eyebrow: "You're invited",
  title: ["Your craft.", "More possibilities."],
  /** Peter, 13 Nov 2026. */
  lead: "We're inviting film and TV professionals in Los Angeles to become founding Gigsters and put their skills to work on paid local projects.",
  cta: "Create your profile",
  joined: "Once you've signed up, you'll be part of our founding Gigster community. We'll keep you updated as we prepare to introduce your services to the public and begin connecting you with new opportunities.",
  needTitle: "What you'll need",
  need: ["A photo of yourself", "The services you offer", "Your rate", "The area you work in and when you're available"],
  needNote: "It takes about 10 minutes and saves as you go, so you can finish later.",
  nextTitle: "After you submit",
  next: [
    ["We review it", "Our team reads every profile. Yours stays private while we do."],
    ["We email you", "With any suggestions, or when it's approved."],
    ["It goes live", "Your profile is published on Between Gigs."],
  ] as [string, string][],
  production: "Production comes first. Pause your availability when the call comes, and come back when you're ready.",
  journey: "Let the journey begin…",
  journeyNote: "Your personal link, if the button doesn't work:",
} as const;

const privateLink = (email: string) => `This link is just for you (${email}) and works for 30 days.`;

/** The cream card: headline, the opportunity, the one button and what joining means. */
function card(inviteUrl: string) {
  const c = INVITE_COPY;
  return [
    craftTitle(c.title),
    `<p style="margin:0 auto 26px;max-width:420px;font-family:${SANS};font-size:17px;line-height:26px;color:${k.ink}">${esc(c.lead)}</p>`,
    craftButton(inviteUrl, c.cta),
    `<p style="margin:22px auto 0;max-width:420px;font-family:${SANS};font-size:14px;line-height:22px;color:${k.muted}">${esc(c.joined)}</p>`,
  ].join("\n");
}

/** Below the frame: what they'll need, what happens after they submit (serif numerals), the sign-off and the journey block. */
function details(inviteUrl: string, email: string) {
  const c = INVITE_COPY;
  const need = c.need.map((t) => `<tr>
<td valign="top" width="22" style="padding:7px 0 0"><div style="width:6px;height:6px;line-height:6px;font-size:1px;border-radius:3px;background-color:${k.ink}">&nbsp;</div></td>
<td valign="top" style="font-family:${SANS};font-size:15px;line-height:23px;color:${k.ink}">${esc(t)}</td>
</tr>`).join("");
  const steps = c.next.map(([t, d], i) => `<tr>
<td valign="top" width="52" style="padding:18px 0;border-top:1px solid ${k.line};font-family:${SERIF};font-size:26px;line-height:28px;color:${k.ink}">0${i + 1}</td>
<td valign="top" style="padding:18px 0;border-top:1px solid ${k.line};font-family:${SANS}"><p style="margin:0;font-size:16px;line-height:22px;font-weight:600;color:${k.ink}">${esc(t)}</p><p style="margin:4px 0 0;font-size:15px;line-height:23px;color:${k.muted}">${esc(d)}</p></td>
</tr>`).join("");
  const journey = `<table ${T} width="100%" bgcolor="${k.cream}" style="margin:30px 0 0;background-color:${k.cream};border:1px solid ${k.line};border-radius:2px">
<tr><td style="padding:22px 24px;font-family:${SANS};text-align:center">
<p style="margin:0 0 10px;font-family:${SERIF};font-size:22px;line-height:28px;font-style:italic;font-weight:500;color:${k.ink}">${esc(c.journey)}</p>
${craftP(esc(c.journeyNote), { size: 13, mb: 4 })}
<p style="margin:0 0 10px;font-size:14px;line-height:21px;font-weight:600"><a href="${esc(inviteUrl)}" style="color:${k.ink};text-decoration:underline;word-break:break-all">${esc(inviteUrl)}</a></p>
${craftP(esc(privateLink(email)), { size: 12 })}
</td></tr></table>`;
  return [
    craftH2(c.needTitle),
    `<table ${T} width="100%">${need}</table>`,
    `<p style="margin:12px 0 0;font-size:15px;line-height:23px;color:${k.muted}">${esc(c.needNote)}</p>`,
    craftH2(c.nextTitle, 34),
    `<table ${T} width="100%">${steps}</table>`,
    `<p style="margin:0;padding-top:20px;border-top:1px solid ${k.line};font-size:15px;line-height:23px;color:${k.muted}">${esc(c.production)}</p>`,
    craftSignOff(SIGN_OFF),
    journey,
  ].join("\n");
}

export function invite({ inviteUrl, email }: InviteProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const c = INVITE_COPY;
  const body = craftHero({ eyebrow: c.eyebrow, inner: card(inviteUrl), ctx }) + craftPaper(details(inviteUrl, email));
  const text = `${c.subject}

${c.eyebrow.toUpperCase()}

${c.title.join(" ")}

${c.lead}

${c.cta}:
${inviteUrl}

${c.joined}

${c.needTitle.toUpperCase()}
${c.need.map((t) => `- ${t}`).join("\n")}
${c.needNote}

${c.nextTitle.toUpperCase()}
${c.next.map(([t, d], i) => `0${i + 1} ${t}: ${d}`).join("\n")}

${c.production}

${SIGN_OFF}

${c.journey}
${c.journeyNote}
${inviteUrl}
${privateLink(email)}

${textFooter(REASON, ctx.siteUrl)}`;

  return { subject: c.subject, preheader: c.preheader, text, html: craftLayout({ title: c.subject, preheader: c.preheader, body, reason: REASON, ctx }) };
}
