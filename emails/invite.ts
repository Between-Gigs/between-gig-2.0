/*
 * Invite to the ~500 waitlist sign-ups: their personal link to create a profile.
 * Design: direction B, "Warm & friendly" (chosen by the client, Nov 2026). The centred logo sits above a white
 * card: a peach hero with the "You're invited" pill, the 800-weight headline with a mint highlighter under
 * "More possibilities.", the lead, one forest pill button, the tagline and the personal-link pill; then the
 * flat-lay photo band; "Three steps, about 10 minutes" as three pastel cards (mint, butter, sage) with number
 * circles and 3D icons; the dashed "Production comes first" note; the founders' sign-off and the plain link.
 * Built as an email, not a page: tables, inline styles, 600px wide and fluid below that; the button and pills are
 * bulletproof table cells. Plus Jakarta Sans loads by <link> where clients allow it and falls back to system sans.
 * The highlighter is a background gradient over a solid mint fallback, so a client that drops gradients shows a
 * mint marker block, and one that drops both shows plain forest text. The card's own palette stays light in every
 * client and theme (only the canvas and footer follow dark mode). On phones (≤620px) the padding, type and button
 * adapt and the step icons hide; Outlook desktop shows square corners.
 * The photo band (public/email/craft-top.jpg) is cropped from generated concept art, not a photograph: Figma AI
 * (gpt-image-2.5-flare), 4 Nov 2026, flat-lay of the tools of the trade; full image public/email/craft-border.jpg,
 * source file figma.com/design/LhX02bL5JSOZ3xrKngyfaQ. The 3D icons are public/img/icons3d (see its README).
 */
import { defaultContext, esc, layout, textFooter, type EmailContext, type RenderedEmail } from "./layout";

export interface InviteProps {
  /** The personal "Create your profile" link: /join?invite=<token>. */
  inviteUrl: string;
  email: string;
}

const REASON = "You're receiving this because you joined the Between Gigs call sheet.";
const FONT = "'Plus Jakarta Sans','Avenir Next','Segoe UI',Helvetica,Arial,sans-serif";
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap";
/** Direction B's palette (the mockup's friendly.css), literal so the card looks the same in every client and theme. */
const b = {
  canvas: "#f4eee4", white: "#ffffff", peach: "#ffe2cc", note: "#fff6f0", mint: "#1fdc8c",
  mintSoft: "#d6f6e6", butter: "#fff0bf", sage: "#e3ebdd", dash: "#e7d9c6",
  ink: "#0f3d29", body: "#2b4a3b", muted: "#4b6357", noteInk: "#3c5a4b",
} as const;

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

const lead = () => INVITE_COPY.lead.join(" ").replace("— ", "—");
const T = `role="presentation" cellpadding="0" cellspacing="0" border="0"`;
const icon = (ctx: EmailContext, name: string, size: number) =>
  `<img src="${esc(`${ctx.assetBase}/img/icons3d/${name}.png`)}" width="${size}" height="${size}" alt="" style="display:block;width:${size}px;height:${size}px;border:0">`;

/** Peach hero: pill, headline with the highlighter, lead, button, tagline, personal-link pill. */
function hero(inviteUrl: string, email: string, ctx: EmailContext) {
  const c = INVITE_COPY;
  // Solid mint first, then the gradient that leaves the top of the letters clear: drops gracefully either way.
  const hl = `background-color:${b.mint};background-image:linear-gradient(${b.peach} 0%,${b.peach} 58%,${b.mint} 58%,${b.mint} 92%,${b.peach} 92%);padding:0 4px;-webkit-box-decoration-break:clone;box-decoration-break:clone`;
  return `<table ${T} width="100%" bgcolor="${b.peach}" style="background-color:${b.peach};border-radius:27px 27px 0 0;border-collapse:separate;border-spacing:0">
<tr><td class="e-inv-pad e-inv-hero" align="center" style="padding:40px 44px 36px;font-family:${FONT};text-align:center;color:${b.ink}">
<table ${T} align="center" style="margin:0 auto;border-collapse:separate"><tr><td bgcolor="${b.white}" style="background-color:${b.white};border-radius:999px;padding:7px 16px 7px 10px;mso-padding-alt:7px 16px 7px 10px">
<table ${T}><tr><td valign="middle" style="padding-right:6px">${icon(ctx, "waving_hand", 22)}</td>
<td valign="middle" style="font-family:${FONT};font-size:14px;line-height:20px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${b.ink}">${esc(c.eyebrow)}</td></tr></table>
</td></tr></table>
<h1 class="e-inv-h1" style="margin:20px 0 14px;font-family:${FONT};font-size:42px;line-height:46px;font-weight:800;letter-spacing:-0.025em;color:${b.ink}">${esc(c.title[0])}<br><span style="${hl}">${esc(c.title[1])}</span></h1>
<p class="e-inv-lead" style="margin:0 auto 26px;max-width:440px;font-size:18px;line-height:28px;color:${b.body}">${esc(lead())}</p>
<table ${T} class="e-inv-btn" align="center" style="margin:0 auto;border-collapse:separate"><tr><td align="center" bgcolor="${b.ink}" style="background-color:${b.ink};border-radius:999px;mso-padding-alt:18px 34px">
<a href="${esc(inviteUrl)}" style="display:inline-block;padding:18px 34px;font-family:${FONT};font-size:17px;line-height:20px;font-weight:800;color:${b.white};text-decoration:none;border-radius:999px">${esc(c.cta)}&nbsp;&rarr;</a>
</td></tr></table>
<p style="margin:18px 0 0;font-size:16px;line-height:24px;font-weight:600;color:${b.body}">${esc(c.tagline)}</p>
<table ${T} align="center" style="margin:16px auto 0;border-collapse:separate"><tr><td class="e-inv-note" bgcolor="${b.note}" style="background-color:${b.note};border-radius:999px;padding:8px 16px;font-family:${FONT};font-size:14px;line-height:20px;color:${b.noteInk};text-align:center">Just for you <span style="white-space:nowrap">(${esc(email)})</span> · works for 30 days</td></tr></table>
</td></tr></table>`;
}

/** The flat-lay band: a real <img>, so every client shows it, full card width and fluid on phones. */
const photo = (ctx: EmailContext) =>
  `<img src="${esc(`${ctx.assetBase}/email/craft-top.jpg`)}" width="600" height="246" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0">`;

/** The three steps as pastel cards, the dashed production note, the sign-off and the plain link. */
function details(inviteUrl: string, ctx: EmailContext) {
  const c = INVITE_COPY;
  const tints = [b.mintSoft, b.butter, b.sage];
  const icons = ["key", "memo", "party_popper"];
  const cards = c.how.map(([t, d], i) => `<table ${T} width="100%" style="border-collapse:separate;margin:0 0 12px"><tr><td class="e-inv-card" bgcolor="${tints[i]}" style="background-color:${tints[i]};border-radius:20px;padding:20px 22px">
<table ${T} width="100%"><tr>
<td class="e-inv-num" valign="top" width="56" style="width:56px"><table ${T} style="border-collapse:separate"><tr><td width="44" height="44" align="center" valign="middle" bgcolor="${b.white}" style="width:44px;height:44px;background-color:${b.white};border-radius:22px;font-family:${FONT};font-size:18px;line-height:44px;font-weight:800;color:${b.ink};text-align:center">${i + 1}</td></tr></table></td>
<td valign="top" style="font-family:${FONT}"><h3 style="margin:2px 0 4px;font-size:18px;line-height:24px;font-weight:800;letter-spacing:-0.01em;color:${b.ink}">${esc(t)}</h3><p style="margin:0;font-size:16px;line-height:25px;color:${b.body}">${esc(d)}</p></td>
<td class="e-inv-icon" valign="top" align="right" width="52" style="width:52px;padding-left:12px">${icon(ctx, icons[i], 40)}</td>
</tr></table>
</td></tr></table>`).join("\n");
  const cut = c.production.indexOf(". ") + 1;
  return `<table ${T} width="100%" bgcolor="${b.white}" style="background-color:${b.white};border-radius:0 0 27px 27px;border-collapse:separate;border-spacing:0">
<tr><td class="e-inv-pad" style="padding:36px 44px 40px;font-family:${FONT};color:${b.ink}">
<h2 class="e-inv-h2" style="margin:0 0 22px;font-family:${FONT};font-size:26px;line-height:32px;font-weight:800;letter-spacing:-0.02em;color:${b.ink}">${esc(c.howTitle)}</h2>
${cards}
<table ${T} width="100%" style="border-collapse:separate;margin:16px 0 0"><tr><td class="e-inv-pause" style="border:2px dashed ${b.dash};border-radius:20px;padding:22px 24px">
<table ${T} width="100%"><tr>
<td class="e-inv-pico" valign="middle" width="54" style="width:54px">${icon(ctx, "clapper_board", 38)}</td>
<td valign="middle" style="font-family:${FONT};font-size:16px;line-height:25px;color:${b.body}"><strong style="font-weight:800;color:${b.ink}">${esc(c.production.slice(0, cut))}</strong>${esc(c.production.slice(cut))}</td>
</tr></table>
</td></tr></table>
<p style="margin:28px 0 0;font-size:20px;line-height:28px;font-weight:800;letter-spacing:-0.01em;color:${b.ink}">Patti &amp; Peter</p>
<p style="margin:0;font-size:16px;line-height:24px;color:${b.muted}">Founders, Between Gigs</p>
<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:${b.muted}">Button not working? Paste this link into your browser:<br><a href="${esc(inviteUrl)}" style="color:${b.ink};text-decoration:underline;word-break:break-all">${esc(inviteUrl)}</a></p>
</td></tr></table>`;
}

export function invite({ inviteUrl, email }: InviteProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const c = INVITE_COPY;
  const body = hero(inviteUrl, email, ctx) + photo(ctx) + details(inviteUrl, ctx);

  const text = `${c.subject}

${c.eyebrow.toUpperCase()}

${c.title.join(" ")}

${lead()}

${c.cta}:
${inviteUrl}

${c.tagline}
Just for you (${email}) · works for 30 days.

${c.howTitle.toUpperCase()}
${c.how.map(([t, d], i) => `${i + 1}. ${t}: ${d}`).join("\n")}

${c.production}

Patti & Peter
Founders, Between Gigs

${textFooter(REASON, ctx.siteUrl)}`;

  return {
    subject: c.subject, preheader: c.preheader, text,
    html: layout({ title: c.subject, preheader: c.preheader, body, reason: REASON, ctx, center: true, radius: 28, font: { family: FONT, href: FONT_HREF }, paper: { canvas: b.canvas, line: b.canvas } }),
  };
}
