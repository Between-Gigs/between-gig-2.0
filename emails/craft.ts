/*
 * The "craft" look shared by the invite and the profile-submitted confirmation (Flow p1 and p6): a flat-lay of the
 * tools of the trade frames a cream card with the logo, a spaced eyebrow, a mint rule and a serif headline, then
 * warm paper below. Its artwork uses a light palette; email clients may still recolor HTML in dark mode.
 * Responsive: on wide screens the photo frames the card (a background image, with a sand colour where a client hides
 * backgrounds, e.g. Outlook on Windows); on phones the frame's padding drops and a strip of the same photo sits above
 * the card instead, so the photo is never just a sliver. The e-k-* classes live in ./layout's stylesheet.
 * Uses the Craft Invitation gallery artwork in both formats, replacing the retired Email Template Frame.
 * Copies stay in public/email because live server builds omit the wallpaper gallery's asset directory.
 * Artwork is illustrative; it is not documentary photography. Original alternate frame files remain archived.
 */
import { esc, layout, type EmailContext } from "./layout";

export const SANS = "Figtree,'Segoe UI',Helvetica,Arial,sans-serif";
export const SERIF = "Newsreader,Georgia,'Times New Roman',serif";
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&family=Newsreader:ital,opsz,wght@0,6..72,500;1,6..72,500&display=swap";
/** The concept's own palette: a warm studio table and a cream card. */
export const k = { canvas: "#efe9df", sand: "#e9e1d3", cream: "#fbf8f2", paper: "#f7f3ec", ink: "#0f3d29", muted: "#4a5249", rule: "#1fdc8c", line: "#e4dccd" } as const;

export const T = `role="presentation" cellpadding="0" cellspacing="0" border="0"`;

/** The serif headline, one span per line so no line breaks mid-phrase. */
export const craftTitle = (lines: readonly string[]) =>
  `<h1 class="e-k-h1" style="margin:0 0 18px;font-family:${SERIF};font-size:46px;line-height:48px;font-weight:500;letter-spacing:-0.02em;color:${k.ink}">${lines.map((t) => `<span style="white-space:nowrap">${esc(t)}</span>`).join("<br>")}</h1>`;

export const craftP = (html: string, { size = 15, mb = 0, color = k.muted, center = false }: { size?: number; mb?: number; color?: string; center?: boolean } = {}) =>
  `<p style="margin:0 0 ${mb}px;${center ? "text-align:center;" : ""}font-family:${SANS};font-size:${size}px;line-height:${Math.round(size * 1.55)}px;color:${color}">${html}</p>`;

export const craftH2 = (text: string, mt = 0) =>
  `<h2 class="e-k-h2" style="margin:${mt}px 0 14px;font-family:${SERIF};font-size:26px;line-height:32px;font-weight:500;color:${k.ink}">${esc(text)}</h2>`;

/** A dark-green button. The padding sits on the link, so the whole pill is clickable. */
export const craftButton = (href: string, label: string, { hero = false }: { hero?: boolean } = {}) => `<table ${T} align="center" ${hero ? 'class="e-invite-button" width="100%"' : ""} style="${hero ? "width:100%;max-width:280px;text-align:center;" : ""}margin:0 auto"><tr><td bgcolor="${k.ink}" style="background-color:${k.ink};border-radius:3px;mso-padding-alt:14px ${hero ? "10px" : "30px"}">
<a ${hero ? 'class="e-invite-button-link"' : ""} href="${esc(href)}" style="display:${hero ? "block" : "inline-block"};padding:14px ${hero ? "10px" : "30px"};font-family:${SANS};font-size:${hero ? 14 : 15}px;${hero ? "white-space:nowrap;" : ""}line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:3px">${esc(label)}${hero ? "" : "&nbsp;&nbsp;&rarr;"}</a>
</td></tr></table>`;

export const craftLink = (href: string, label: string) =>
  `<a href="${esc(href)}" style="color:${k.ink};text-decoration:underline">${esc(label)}</a>`;

export const craftRule = (margin = "26px auto 14px", width = "100%") =>
  `<div style="margin:${margin};width:${width};height:1px;line-height:1px;font-size:1px;background-color:${k.line}">&nbsp;</div>`;

/** The spaced, capitalised team sign-off. */
export const craftSignOff = (text: string, mt = 22, center = false, sentenceCase = false) =>
  `<p style="margin:${mt}px 0 0;${center ? "text-align:center;" : ""}font-family:${SANS};font-size:12px;line-height:18px;font-weight:700;letter-spacing:${sentenceCase ? "0.04em" : "0.2em;text-transform:uppercase"};color:${k.ink}">${esc(text)}</p>`;

/** The photo frame around the cream card, with logo, eyebrow and rule; `inner` follows the rule. */
export function craftHero({ eyebrow, inner, ctx, openPaper = false }: { eyebrow: string; inner: string; ctx: EmailContext; openPaper?: boolean }) {
  const frame = `${ctx.assetBase}/email/craft-invitation-portrait.jpg`;
  const strip = `${ctx.assetBase}/email/craft-invitation-desktop.jpg`;
  const logo = `${ctx.assetBase}/email/between-gigs-wide-on-light.png`;
  if (openPaper) return `<table ${T} class="e-invite-scene" width="100%" height="784" bgcolor="${k.cream}" background="${esc(frame)}" style="height:784px;background-color:${k.cream};background-image:url('${esc(frame)}');background-size:100% 100%;background-position:center;background-repeat:no-repeat">
<tr><td class="e-invite-center" align="center" valign="top" style="padding:144.5px 96px 212.5px;font-family:${SANS};text-align:center">
<img class="e-invite-logo" src="${esc(logo)}" width="235" height="74" alt="Between Gigs" style="display:block;margin:0 auto;width:235.2px;height:73.5px;border:0;color:${k.ink};font-size:18px;font-weight:600">
<p class="e-invite-eyebrow" style="margin:45.5px 0 10px;font-size:22px;line-height:28px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:${k.muted}">${esc(eyebrow)}</p>
<div class="e-invite-rule" style="margin:0 auto 22px;width:28px;height:2px;line-height:2px;font-size:1px;background-color:${k.rule}">&nbsp;</div>
${inner}
</td></tr></table>`;
  return `<!--[if !mso]><!--><div class="e-k-strip" style="display:none;max-height:0;overflow:hidden;mso-hide:all"><img src="${esc(strip)}" width="600" alt="" style="display:block;width:100%;height:auto;border:0"></div><!--<![endif]-->
<table ${T} width="100%" bgcolor="${k.sand}" background="${esc(frame)}" style="background-color:${k.sand};background-image:url('${esc(frame)}');background-size:cover;background-position:center">
<tr><td class="e-k-frame" align="center" style="padding:88px 60px">
<table ${T} width="100%" bgcolor="${k.cream}" style="background-color:${k.cream};border-radius:2px;box-shadow:0 18px 40px rgba(15,61,41,.18)">
<tr><td class="e-k-card" align="center" style="padding:44px 36px 34px;font-family:${SANS};text-align:center">
<img src="${esc(logo)}" width="112" height="35" alt="Between Gigs" style="display:block;margin:0 auto;width:112px;height:35px;border:0;color:${k.ink};font-size:18px;font-weight:600">
<p style="margin:28px 0 10px;font-size:11px;line-height:14px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:${k.muted}">${esc(eyebrow)}</p>
<div style="margin:0 auto 22px;width:28px;height:2px;line-height:2px;font-size:1px;background-color:${k.rule}">&nbsp;</div>
${inner}
</td></tr></table>
</td></tr></table>`;
}

/** Warm paper below the frame. */
export const craftPaper = (inner: string, pad = "40px 56px 36px") =>
  `<table ${T} width="100%" bgcolor="${k.paper}" style="background-color:${k.paper}">
<tr><td class="e-k-pad" style="padding:${pad};font-family:${SANS}">${inner}</td></tr></table>`;

/** The shared shell, set for the craft look: no logo row (the card has its own), warm canvas, edge to edge on phones. */
export const craftLayout = ({ title, preheader, body, reason, ctx, unsubscribe, lightOnly, center }: { title: string; preheader: string; body: string; reason: string; ctx: EmailContext; unsubscribe?: string; lightOnly?: boolean; center?: boolean }) =>
  layout({ title, preheader, body, reason, ctx, unsubscribe, lightOnly, center, header: false, edge: true, paper: { canvas: k.canvas, line: k.line }, font: { family: SANS, href: FONT_HREF } });
