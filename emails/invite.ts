/*
 * Invite to the ~500 waitlist sign-ups: their personal link to create a profile.
 * Design: "Your craft. More possibilities." (the craft-border concept), chosen by the client on 4 Nov 2026 as the
 * invite they'll send. The flat-lay of the tools of the trade sits above and below a cream card with the logo, the
 * headline and one button; the three steps, the founders' note and the plain link follow on the same warm paper.
 * The photos are real <img> bands (public/email/craft-top.jpg and craft-bottom.jpg), not a CSS background, so every
 * client shows them and they scale with the screen; on phones the card runs edge to edge and the type steps down.
 * The bands are cropped from generated concept art, not a photograph: Figma AI (gpt-image-2.5-flare), 4 Nov 2026,
 * from a prompt describing the concept's flat-lay (forest velvet, tailor's scissors, film camera, instant photos,
 * fabric swatches, costume sketch, XLR cable) around an empty cream centre; the full image is
 * public/email/craft-border.jpg, source file figma.com/design/LhX02bL5JSOZ3xrKngyfaQ.
 */
import { defaultContext, esc, layout, textFooter, FONT_UI, type EmailContext, type RenderedEmail } from "./layout";

export interface InviteProps {
  /** The personal "Create your profile" link: /join?invite=<token>. */
  inviteUrl: string;
  email: string;
}

const REASON = "You're receiving this because you joined the Between Gigs call sheet.";
const FONT_SERIF = "Newsreader,Georgia,'Times New Roman',serif";
/** The frame's own palette: a warm studio table, so the card stays light in every client and theme. */
const craft = { canvas: "#f1ece3", cream: "#fbf8f2", paper: "#f7f3ec", ink: "#0f3d29", muted: "#3f4a42", rule: "#1fdc8c", line: "#e4dccd" } as const;

/** The locked text. */
export const INVITE_COPY = {
  subject: "You're invited to Between Gigs",
  preheader: "Your craft. More possibilities. Create your profile: it takes about 10 minutes.",
  eyebrow: "You're invited",
  title: ["Your craft.", "More possibilities."],
  lead: ["Bring the work you already have.", "Show what your skills can offer\u2014", "on set and beyond."],
  cta: "Create your profile",
  tagline: "A place for your work, skills and next chapter.",
  howTitle: "Three steps, about 10 minutes",
  how: [
    ["Open your link", "Set up your account with this email address."],
    ["Fill in your page", "Your photo, what you do on set, the services you'd offer, and where and when you work, right on the page clients will see. It saves as you go."],
    ["Send it for review", "We review every profile before it goes live, and email you when it's approved."],
  ] as [string, string][],
  production: "Production comes first. Pause your availability when the call comes, and come back when you're ready.",
} as const;

/** A photo band: a real <img>, so every client shows it, at full card width and fluid on phones. */
const band = (src: string, w: number, h: number) =>
  `<img src="${esc(src)}" width="${w}" height="${h}" alt="" style="display:block;width:100%;max-width:${w}px;height:auto;border:0">`;

/** The hero: the top of the flat-lay, the cream card with the headline and button, the bottom of the flat-lay. */
function hero(inviteUrl: string, email: string, ctx: EmailContext) {
  const c = INVITE_COPY;
  const logo = `${ctx.assetBase}/email/between-gigs-wide-on-light.png`;
  return `${band(`${ctx.assetBase}/email/craft-top.jpg`, 600, 246)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${craft.cream}" style="background-color:${craft.cream}">
<tr><td class="e-craft-pad e-craft-hero" align="center" style="padding:48px 56px 44px;font-family:${FONT_UI};text-align:center">
<img src="${esc(logo)}" width="112" height="35" alt="Between Gigs" style="display:block;margin:0 auto;width:112px;height:35px;border:0;color:${craft.ink};font-size:18px;font-weight:600">
<p style="margin:28px 0 10px;font-size:11px;line-height:14px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:${craft.muted}">${esc(c.eyebrow)}</p>
<div style="margin:0 auto 22px;width:28px;height:2px;line-height:2px;font-size:1px;background-color:${craft.rule}">&nbsp;</div>
<h1 class="e-craft-h1" style="margin:0 0 18px;font-family:${FONT_SERIF};font-size:46px;line-height:50px;font-weight:500;letter-spacing:-0.02em;color:${craft.ink}">${c.title.map((t) => `<span style="white-space:nowrap">${esc(t)}</span>`).join("<br>")}</h1>
<p style="margin:0 auto 28px;max-width:360px;font-size:16px;line-height:25px;color:${craft.muted}">${esc(c.lead.join(" ").replace("\u2014 ", "\u2014"))}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto"><tr><td bgcolor="${craft.ink}" style="background-color:${craft.ink};border-radius:8px">
<a href="${esc(inviteUrl)}" style="display:inline-block;padding:15px 30px;font-family:${FONT_UI};font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${esc(c.cta)}&nbsp;&rarr;</a>
</td></tr></table>
<p style="margin:18px 0 0;font-size:14px;line-height:21px;color:${craft.muted}">${esc(c.tagline)}</p>
<p style="margin:6px 0 0;font-size:12px;line-height:18px;color:${craft.muted}">Just for you (${esc(email)}) · works for 30 days</p>
</td></tr></table>
${band(`${ctx.assetBase}/email/craft-bottom.jpg`, 600, 223)}`;
}

/** Below the photos: the three steps with serif numerals, the founders' note and the plain link, on the same paper. */
function details(inviteUrl: string) {
  const c = INVITE_COPY;
  const steps = c.how.map(([t, d], i) => `<tr>
<td valign="top" width="52" style="padding:18px 0;border-top:1px solid ${craft.line};font-family:${FONT_SERIF};font-size:26px;line-height:28px;color:${craft.ink}">0${i + 1}</td>
<td valign="top" style="padding:18px 0;border-top:1px solid ${craft.line};font-family:${FONT_UI}"><p style="margin:0;font-size:16px;line-height:22px;font-weight:600;color:${craft.ink}">${esc(t)}</p><p style="margin:4px 0 0;font-size:15px;line-height:23px;color:${craft.muted}">${esc(d)}</p></td>
</tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${craft.paper}" style="background-color:${craft.paper}">
<tr><td class="e-craft-pad" style="padding:40px 56px 36px;font-family:${FONT_UI}">
<h2 class="e-craft-h2" style="margin:0 0 14px;font-family:${FONT_SERIF};font-size:26px;line-height:32px;font-weight:500;color:${craft.ink}">${esc(c.howTitle)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps}</table>
<p style="margin:20px 0 0;padding-top:20px;border-top:1px solid ${craft.line};font-size:15px;line-height:23px;color:${craft.muted}">${esc(c.production)}</p>
<p style="margin:22px 0 0;font-family:${FONT_SERIF};font-size:20px;line-height:26px;font-style:italic;color:${craft.ink}">Patti &amp; Peter</p>
<p style="margin:2px 0 0;font-size:13px;line-height:20px;color:${craft.muted}">Founders, Between Gigs</p>
<p style="margin:28px 0 0;font-size:12px;line-height:19px;color:${craft.muted}">Button not working? Paste this link into your browser:<br><a href="${esc(inviteUrl)}" style="color:${craft.ink};text-decoration:underline;word-break:break-all">${esc(inviteUrl)}</a></p>
</td></tr></table>`;
}

export function invite({ inviteUrl, email }: InviteProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const c = INVITE_COPY;
  const body = hero(inviteUrl, email, ctx) + details(inviteUrl);

  const text = `${c.subject}

${c.eyebrow.toUpperCase()}

${c.title.join(" ")}

${c.lead.join(" ").replace("\u2014 ", "\u2014")}

${c.cta}:
${inviteUrl}

${c.tagline}
This link is just for you (${email}) and works for 30 days.

${c.howTitle.toUpperCase()}
${c.how.map(([t, d], i) => `0${i + 1} ${t}: ${d}`).join("\n")}

${c.production}

Patti & Peter
Founders, Between Gigs

${textFooter(REASON, ctx.siteUrl)}`;

  return { subject: c.subject, preheader: c.preheader, html: layout({ title: c.subject, preheader: c.preheader, body, reason: REASON, ctx, header: false, edge: true, paper: { canvas: craft.canvas, line: craft.line } }), text };
}
