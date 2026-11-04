/*
 * Invite to the ~500 waitlist sign-ups: their personal link to create a profile.
 * Design: the client's confirmed invite, "Your craft. More possibilities." (Justin, 4 Nov 2026: "this is the email we
 * will use"), built faithfully: a flat-lay of the tools of the trade frames a cream card with the logo, "You're
 * invited", the serif headline, one dark-green button and the tagline. It stays this design even though the site's
 * product screens moved to direction B; the email is its own approved piece. Below the frame, on the same warm
 * paper: the three steps, the founders' note and the plain link.
 * Responsive: on wide screens the photo frames the card (a background image, with a sand colour where a client hides
 * backgrounds, e.g. Outlook on Windows); on phones the frame's padding drops and a strip of the same photo sits above
 * the card instead, so the photo is never just a sliver.
 * The photo is generated concept art matching the approved concept, not a photograph: Figma AI (gpt-image-2.5-flare),
 * 4 Nov 2026; public/email/craft-border.jpg (frame) and craft-top.jpg (phone strip), source file
 * figma.com/design/LhX02bL5JSOZ3xrKngyfaQ. Swap them for the original photograph when it's available.
 */
import { defaultContext, esc, layout, textFooter, type EmailContext, type RenderedEmail } from "./layout";

export interface InviteProps {
  /** The personal "Create your profile" link: /join?invite=<token>. */
  inviteUrl: string;
  email: string;
}

const REASON = "You're receiving this because you joined the Between Gigs call sheet.";
const SANS = "Figtree,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Newsreader,Georgia,'Times New Roman',serif";
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&family=Newsreader:opsz,wght@6..72,500&display=swap";
/** The concept's own palette: a warm studio table and a cream card, light in every client and theme. */
const k = { canvas: "#efe9df", sand: "#e9e1d3", cream: "#fbf8f2", paper: "#f7f3ec", ink: "#0f3d29", muted: "#4a5249", rule: "#1fdc8c", line: "#e4dccd" } as const;

/** The locked text. */
export const INVITE_COPY = {
  subject: "You're invited to Between Gigs",
  preheader: "Your craft. More possibilities. Create your profile: it takes about 10 minutes.",
  eyebrow: "You're invited",
  title: ["Your craft.", "More possibilities."],
  lead: ["Bring the work you already have.", "Show what your skills can offer—", "on set and beyond."],
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

const T = `role="presentation" cellpadding="0" cellspacing="0" border="0"`;

/** The hero: the flat-lay frames the cream card (phones: a photo strip above it instead). */
function hero(inviteUrl: string, email: string, ctx: EmailContext) {
  const c = INVITE_COPY;
  const frame = `${ctx.assetBase}/email/craft-border.jpg`;
  const strip = `${ctx.assetBase}/email/craft-top.jpg`;
  const logo = `${ctx.assetBase}/email/between-gigs-wide-on-light.png`;
  return `<!--[if !mso]><!--><div class="e-k-strip" style="display:none;max-height:0;overflow:hidden;mso-hide:all"><img src="${esc(strip)}" width="600" alt="" style="display:block;width:100%;height:auto;border:0"></div><!--<![endif]-->
<table ${T} width="100%" bgcolor="${k.sand}" background="${esc(frame)}" style="background-color:${k.sand};background-image:url('${esc(frame)}');background-size:cover;background-position:center">
<tr><td class="e-k-frame" align="center" style="padding:88px 60px">
<table ${T} width="100%" bgcolor="${k.cream}" style="background-color:${k.cream};border-radius:2px;box-shadow:0 18px 40px rgba(15,61,41,.18)">
<tr><td class="e-k-card" align="center" style="padding:44px 36px 34px;font-family:${SANS};text-align:center">
<img src="${esc(logo)}" width="112" height="35" alt="Between Gigs" style="display:block;margin:0 auto;width:112px;height:35px;border:0;color:${k.ink};font-size:18px;font-weight:600">
<p style="margin:28px 0 10px;font-size:11px;line-height:14px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:${k.muted}">${esc(c.eyebrow)}</p>
<div style="margin:0 auto 22px;width:28px;height:2px;line-height:2px;font-size:1px;background-color:${k.rule}">&nbsp;</div>
<h1 class="e-k-h1" style="margin:0 0 18px;font-family:${SERIF};font-size:46px;line-height:48px;font-weight:500;letter-spacing:-0.02em;color:${k.ink}">${c.title.map((t) => `<span style="white-space:nowrap">${esc(t)}</span>`).join("<br>")}</h1>
<p class="e-k-lead" style="margin:0 0 26px;font-size:16px;line-height:24px;color:${k.muted}">${c.lead.map(esc).join("<br>")}</p>
<table ${T} align="center" style="margin:0 auto"><tr><td bgcolor="${k.ink}" style="background-color:${k.ink};border-radius:3px">
<a href="${esc(inviteUrl)}" style="display:inline-block;padding:14px 30px;font-family:${SANS};font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:3px">${esc(c.cta)}&nbsp;&nbsp;&rarr;</a>
</td></tr></table>
<p style="margin:18px 0 0;font-size:13px;line-height:20px;color:${k.muted}">${esc(c.tagline)}</p>
<div style="margin:26px auto 14px;height:1px;line-height:1px;font-size:1px;background-color:${k.line}">&nbsp;</div>
<p style="margin:0;font-size:12px;line-height:18px;color:${k.muted}">This link is just for you (${esc(email)}) and works for 30 days.</p>
</td></tr></table>
</td></tr></table>`;
}

/** Below the frame: the three steps with serif numerals, the founders' note and the plain link. */
function details(inviteUrl: string) {
  const c = INVITE_COPY;
  const steps = c.how.map(([t, d], i) => `<tr>
<td valign="top" width="52" style="padding:18px 0;border-top:1px solid ${k.line};font-family:${SERIF};font-size:26px;line-height:28px;color:${k.ink}">0${i + 1}</td>
<td valign="top" style="padding:18px 0;border-top:1px solid ${k.line};font-family:${SANS}"><p style="margin:0;font-size:16px;line-height:22px;font-weight:600;color:${k.ink}">${esc(t)}</p><p style="margin:4px 0 0;font-size:15px;line-height:23px;color:${k.muted}">${esc(d)}</p></td>
</tr>`).join("");
  return `<table ${T} width="100%" bgcolor="${k.paper}" style="background-color:${k.paper}">
<tr><td class="e-k-pad" style="padding:40px 56px 36px;font-family:${SANS}">
<h2 class="e-k-h2" style="margin:0 0 14px;font-family:${SERIF};font-size:26px;line-height:32px;font-weight:500;color:${k.ink}">${esc(c.howTitle)}</h2>
<table ${T} width="100%">${steps}</table>
<p style="margin:20px 0 0;padding-top:20px;border-top:1px solid ${k.line};font-size:15px;line-height:23px;color:${k.muted}">${esc(c.production)}</p>
<p style="margin:22px 0 0;font-family:${SERIF};font-size:20px;line-height:26px;font-style:italic;color:${k.ink}">Patti &amp; Peter</p>
<p style="margin:2px 0 0;font-size:13px;line-height:20px;color:${k.muted}">Founders, Between Gigs</p>
<p style="margin:28px 0 0;font-size:12px;line-height:19px;color:${k.muted}">Button not working? Paste this link into your browser:<br><a href="${esc(inviteUrl)}" style="color:${k.ink};text-decoration:underline;word-break:break-all">${esc(inviteUrl)}</a></p>
</td></tr></table>`;
}

export function invite({ inviteUrl, email }: InviteProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const c = INVITE_COPY;
  const body = hero(inviteUrl, email, ctx) + details(inviteUrl);
  const text = `${c.subject}

${c.eyebrow.toUpperCase()}

${c.title.join(" ")}

${c.lead.join(" ").replace("— ", "—")}

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

  return {
    subject: c.subject, preheader: c.preheader, text,
    html: layout({ title: c.subject, preheader: c.preheader, body, reason: REASON, ctx, header: false, edge: true, paper: { canvas: k.canvas, line: k.line }, font: { family: SANS, href: FONT_HREF } }),
  };
}
