/*
 * Invite to the ~500 waitlist sign-ups: their personal link to create a profile.
 * Design: "Your craft. More possibilities." (the craft-border concept), chosen by the client on 4 Nov 2026 as the
 * invite they'll send. A flat-lay of the tools of the trade frames a cream card with the logo, the headline and one
 * button. Below the frame: the three steps, the founders' note and the plain link. Compare at /emails/invite/.
 * The frame photo is one replaceable file, public/email/craft-border.jpg; where an email client hides background
 * images (Outlook on Windows), the frame falls back to a solid sand colour and the card reads the same.
 * craft-border.jpg is generated concept art, not a photograph: Figma AI (gpt-image-2.5-flare), 4 Nov 2026, from a prompt
 * describing the concept's flat-lay (forest velvet, tailor's scissors, film camera, instant photos, fabric swatches,
 * costume sketch, XLR cable) around an empty cream centre. Source file: figma.com/design/LhX02bL5JSOZ3xrKngyfaQ.
 */
import { defaultContext, esc, h2, layout, link, p, section, signature, spacer, textFooter, FONT_UI, type EmailContext, type RenderedEmail } from "./layout";
import { light } from "./tokens";

export interface InviteProps {
  /** The personal "Create your profile" link: /join?invite=<token>. */
  inviteUrl: string;
  email: string;
}

const REASON = "You're receiving this because you joined the Between Gigs call sheet.";
const FONT_SERIF = "Newsreader,Georgia,'Times New Roman',serif";
/** The frame's own palette: a warm studio table, so the card stays light in every client and theme. */
const craft = { sand: "#e9e1d3", cream: "#fbf8f2", ink: "#0f3d29", muted: "#3f4a42", rule: "#1fdc8c", line: "#e4dccd" } as const;

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

/** The frame: the flat-lay photo around a cream card, centred like the concept. */
function frame(inviteUrl: string, email: string, ctx: EmailContext) {
  const c = INVITE_COPY;
  const bg = `${ctx.assetBase}/email/craft-border.jpg`;
  const logo = `${ctx.assetBase}/email/between-gigs-wide-on-light.png`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${craft.sand}" background="${esc(bg)}"
  style="background-color:${craft.sand};background-image:url('${esc(bg)}');background-size:cover;background-position:center;border-radius:12px 12px 0 0">
<tr><td class="e-craft" align="center" style="padding:96px 64px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${craft.cream}" style="background-color:${craft.cream};border-radius:4px;box-shadow:0 18px 40px rgba(15,61,41,.16)">
<tr><td class="e-craft-card" align="center" style="padding:44px 36px 36px;font-family:${FONT_UI};text-align:center">
<img src="${esc(logo)}" width="112" height="35" alt="Between Gigs" style="display:block;margin:0 auto;width:112px;height:35px;border:0;color:${craft.ink};font-size:18px;font-weight:600">
<p style="margin:28px 0 10px;font-size:11px;line-height:14px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:${craft.muted}">${esc(c.eyebrow)}</p>
<div style="margin:0 auto 22px;width:28px;height:2px;line-height:2px;font-size:1px;background-color:${craft.rule}">&nbsp;</div>
<h1 class="e-craft-h1" style="margin:0 0 18px;font-family:${FONT_SERIF};font-size:44px;line-height:46px;font-weight:500;letter-spacing:-0.02em;color:${craft.ink}">${c.title.map(esc).join("<br>")}</h1>
<p style="margin:0 0 26px;font-size:16px;line-height:24px;color:${craft.muted}">${c.lead.map(esc).join("<br>")}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto"><tr><td bgcolor="${craft.ink}" style="background-color:${craft.ink};border-radius:8px">
<a href="${esc(inviteUrl)}" style="display:inline-block;padding:14px 28px;font-family:${FONT_UI};font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${esc(c.cta)}&nbsp;&rarr;</a>
</td></tr></table>
<p style="margin:18px 0 0;font-size:13px;line-height:20px;color:${craft.muted}">${esc(c.tagline)}</p>
<div style="margin:26px auto 14px;height:1px;line-height:1px;font-size:1px;background-color:${craft.line}">&nbsp;</div>
<p style="margin:0;font-size:12px;line-height:18px;color:${craft.muted}">This link is just for you (${esc(email)}) and works for 30 days.</p>
</td></tr></table>
</td></tr></table>`;
}

export function invite({ inviteUrl, email }: InviteProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const c = INVITE_COPY;
  // The three steps with the site's 3D icons (public/img/icons3d), PNGs from the same host as the logo.
  const icons = ["envelope", "memo", "check_mark_button"];
  const how = [h2(c.howTitle), `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px">${c.how.map(([t, d], i) => `<tr>
<td valign="top" width="60" style="padding:12px 0"><img src="${esc(`${ctx.assetBase}/img/icons3d/${icons[i]}.png`)}" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border:0"></td>
<td valign="top" style="padding:12px 0;font-family:${FONT_UI}"><p class="e-ink" style="margin:0;font-size:16px;line-height:22px;font-weight:700;color:${light.ink}">${esc(t)}</p><p class="e-muted" style="margin:3px 0 0;font-size:15px;line-height:22px;color:${light.inkMuted}">${esc(d)}</p></td>
</tr>`).join("")}</table>`];
  const body = [
    frame(inviteUrl, email, ctx),
    section([
      ...how,
      p(c.production, { muted: true, size: 15 }),
      signature(),
      spacer(16),
      p(`Button not working? Paste this link into your browser:<br>${link(inviteUrl, inviteUrl)}`, { muted: true, size: 13, mb: 28 }),
    ].join(""), "32px 44px 8px"),
  ].join("");

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

  return { subject: c.subject, preheader: c.preheader, html: layout({ title: c.subject, preheader: c.preheader, body, reason: REASON, ctx, header: false }), text };
}
