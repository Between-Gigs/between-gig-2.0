/*
 * Invite to the ~500 waitlist sign-ups: their personal link to create a profile.
 * Copy: locked 4 Nov 2026 (one text for every style). It reuses approved phrases from the live site and the
 * welcome / coming-soon emails ("Your next chapter starts here", "the call sheet") and describes the new
 * three-step flow: open the link, fill in your page, send it for review.
 * Styles: "pass" (the chosen default: an invitation card), "letter" (a note from Patti & Peter) and "classic"
 * (the forest banner). Compare them at /emails/invite/.
 */
import { button, defaultContext, esc, hero, layout, link, p, section, signature, spacer, steps, textFooter, h2, FONT_DISPLAY, FONT_UI, type EmailContext, type RenderedEmail } from "./layout";
import { dark, light } from "./tokens";

export type InviteStyle = "pass" | "letter" | "classic";
export const inviteStyles: { id: InviteStyle; label: string; note: string }[] = [
  { id: "pass", label: "Pass", note: "An invitation card: it reads as a ticket onto the call sheet. Recommended." },
  { id: "letter", label: "Letter", note: "A plain note from Patti & Peter: the most personal, and the most likely to land in the main inbox." },
  { id: "classic", label: "Classic", note: "The forest banner the other emails use." },
];

export interface InviteProps {
  /** The personal "Create your profile" link: /join?invite=<token>. */
  inviteUrl: string;
  email: string;
  /** Which design to render; the copy is the same in all of them. */
  style?: InviteStyle;
}

const REASON = "You're receiving this because you joined the Between Gigs call sheet.";

/** The locked text. */
export const INVITE_COPY = {
  subject: "You're on the call sheet: create your Between Gigs profile",
  preheader: "Your invitation is here. Fill in your profile right on the page; it takes about 10 minutes.",
  eyebrow: "Los Angeles Call Sheet",
  title: "Your next chapter",
  accent: "starts here.",
  hello: "Thank you for getting on the call sheet. Your invitation is here: create your Between Gigs profile and be among the first professionals clients can find in Los Angeles.",
  why: "You've spent your career mastering your craft. Between Gigs puts those skills to work beyond the set: on your terms, at your rates and around your production schedule.",
  cta: "Create your profile",
  howTitle: "Three steps, about 10 minutes",
  how: [
    ["Open your link", "Set up your account with this email address."],
    ["Fill in your page", "Your photo, what you do on set, the services you'd offer, and where and when you work, right on the page clients will see. It saves as you go."],
    ["Send it for review", "We review every profile before it goes live, and email you when it's approved."],
  ] as [string, string][],
  production: "Production comes first. Pause your availability when the call comes, and come back when you're ready.",
} as const;

const personal = (email: string) => `This link is just for you (${esc(email)}) and works for 30 days.`;

/** The invitation card: forest, with a perforated edge and the guest's details like a pass. */
function pass(email: string) {
  const c = INVITE_COPY;
  const label = (t: string) => `<p style="margin:0 0 4px;font-family:${FONT_UI};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${dark.inkSubtle}">${esc(t)}</p>`;
  const value = (t: string) => `<p style="margin:0;font-family:${FONT_UI};font-size:15px;line-height:20px;font-weight:600;color:${dark.ink};word-break:break-all">${esc(t)}</p>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${light.surfaceBrand}" style="background-color:${light.surfaceBrand};border-radius:19px 19px 0 0;border-collapse:separate;border-spacing:0">
<tr><td class="e-pad" style="padding:40px 44px 32px;font-family:${FONT_UI}">
<p style="margin:0 0 14px;font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${dark.inkBrand}">${esc(c.eyebrow)} &nbsp;·&nbsp; Invitation</p>
<h1 class="e-h1" style="margin:0;font-family:${FONT_DISPLAY};font-size:36px;line-height:42px;font-weight:600;letter-spacing:-0.02em;color:${dark.ink}">${esc(c.title)}<br><span style="color:${dark.inkBrand}">${esc(c.accent)}</span></h1>
</td></tr>
<tr><td style="padding:0 20px"><div style="border-top:2px dashed ${dark.line};height:0;line-height:0;font-size:0">&nbsp;</div></td></tr>
<tr><td class="e-pad" style="padding:20px 44px 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top" style="padding-right:16px">${label("Guest")}${value(email)}</td>
<td valign="top" width="110" style="width:110px">${label("Valid for")}${value("30 days")}</td>
</tr></table>
</td></tr>
</table>`;
}

export function invite({ inviteUrl, email, style = "pass" }: InviteProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const c = INVITE_COPY;
  const how = [h2(c.howTitle), steps(c.how)];
  const close = [
    p(c.production, { muted: true, size: 15 }),
    signature(),
    spacer(16),
    p(`Button not working? Paste this link into your browser:<br>${link(inviteUrl, inviteUrl)}`, { muted: true, size: 13, mb: 28 }),
  ];

  const body = style === "letter"
    ? section([
        `<h1 class="e-ink" style="margin:0 0 20px;font-family:${FONT_DISPLAY};font-size:28px;line-height:34px;font-weight:600;letter-spacing:-0.01em;color:${light.ink}">${esc(c.title)} <span class="e-brand" style="color:${light.inkBrand}">${esc(c.accent)}</span></h1>`,
        p("Hello,"),
        p(c.hello),
        p(c.why),
        button(inviteUrl, c.cta),
        p(personal(email), { muted: true, size: 13, mb: 24 }),
        ...how,
        ...close,
      ].join(""), "40px 44px 8px")
    : [
        style === "pass" ? pass(email) : hero({ eyebrow: c.eyebrow, title: c.title, accent: c.accent }),
        section([
          p(c.hello),
          p(c.why, { muted: true }),
          button(inviteUrl, c.cta),
          style === "pass" ? "" : p(personal(email), { muted: true, size: 13, mb: 8 }),
        ].join("")),
        section([...how, ...close].join(""), "16px 44px 8px"),
      ].join("");

  const text = `${c.subject}

${c.title} ${c.accent}

${style === "letter" ? "Hello,\n\n" : ""}${c.hello}

${c.why}

${c.cta}:
${inviteUrl}

This link is just for you (${email}) and works for 30 days.

${c.howTitle.toUpperCase()}
${c.how.map(([t, d], i) => `0${i + 1} ${t}: ${d}`).join("\n")}

${c.production}

Patti & Peter
Founders, Between Gigs

${textFooter(REASON, ctx.siteUrl)}`;

  return { subject: c.subject, preheader: c.preheader, html: layout({ title: c.subject, preheader: c.preheader, body, reason: REASON, ctx }), text };
}
