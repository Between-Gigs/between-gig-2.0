/*
 * Shared shell for every Between Gigs email: table-based, 600px, inline styles, light by default with a
 * dark-mode stylesheet for clients that honour prefers-color-scheme (Apple Mail, iOS Mail, Outlook.com
 * via [data-ogsc]). Gmail ignores the media query and shows the light version, which is designed to stand
 * on its own. Colors are literal values from the design system's tokens (./tokens.ts).
 */
import { dark, light } from "./tokens";

export interface EmailContext {
  /** Where the logo PNGs are served (public/email/*). Production: https://between-gigs.com. */
  assetBase: string;
  /** Site root for footer links. */
  siteUrl: string;
}

export interface RenderedEmail {
  subject: string;
  /** The inbox preview line after the subject. */
  preheader: string;
  html: string;
  text: string;
}

export const defaultContext: EmailContext = { assetBase: "https://between-gigs.com", siteUrl: "https://between-gigs.com" };

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const FONT_UI = "Figtree,'Segoe UI',Helvetica,Arial,sans-serif";
export const FONT_DISPLAY = "Sora,'Avenir Next','Segoe UI',Helvetica,Arial,sans-serif";
export const FONT_MONO = "'JetBrains Mono','SF Mono',Menlo,Consolas,monospace";

/*
 * Dark-mode overrides, keyed by class. Each element carries its light colors inline plus a class here.
 * The preview at /emails swaps the media query to force one theme (see app/emails/preview.ts).
 */
const darkCss = `
.e-body,.e-outer{background-color:${dark.bg}!important}
.e-card{background-color:${dark.surface}!important;border-color:${dark.line}!important}
.e-sunken{background-color:${dark.surfaceSunken}!important;border-color:${dark.line}!important}
.e-ink{color:${dark.ink}!important}
.e-muted{color:${dark.inkMuted}!important}
.e-subtle{color:${dark.inkSubtle}!important}
.e-brand{color:${dark.inkBrand}!important}
.e-link{color:${dark.link}!important}
.e-line{border-color:${dark.line}!important}
.e-rule{background-color:${dark.line}!important}
.e-logo-light{display:none!important;max-height:0!important;overflow:hidden!important}
.e-logo-dark{display:block!important;max-height:none!important;overflow:visible!important}
`;

/* Outlook.com marks dark mode with [data-ogsc] on an ancestor: scope every selector in every rule. */
const ogsc = darkCss.trim().split("\n").map((rule) => {
  const [selectors, decls] = rule.split("{");
  return `${selectors.split(",").map((sel) => `[data-ogsc] ${sel}`).join(",")}{${decls}`;
}).join("\n");

export function layout({ title, preheader, body, reason, ctx }: { title: string; preheader: string; body: string; reason: string; ctx: EmailContext }) {
  const site = ctx.siteUrl;
  const logo = (theme: "light" | "dark") => `${ctx.assetBase}/email/between-gigs-wide-on-${theme}.png`;
  // Pads the preheader so clients don't pull body text into the inbox preview.
  const spacer = "&#847;&zwnj;&nbsp;".repeat(60);
  return `<!doctype html>
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&family=Sora:wght@600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
a{text-decoration:underline}
a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}
@media (max-width:620px){
.e-container{width:100%!important}
.e-pad{padding-left:24px!important;padding-right:24px!important}
.e-h1{font-size:30px!important;line-height:36px!important}
.e-btn a{display:block!important}
}
@media (prefers-color-scheme:dark){${darkCss}}
${ogsc}
</style>
</head>
<body class="e-body" style="margin:0;padding:0;background-color:${light.bg};color:${light.ink};font-family:${FONT_UI}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${light.bg};opacity:0">${esc(preheader)}${spacer}</div>
<table role="presentation" class="e-outer" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${light.bg}" style="background-color:${light.bg}">
<tr><td align="center" style="padding:32px 12px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="e-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;border-collapse:separate;border-spacing:0">
<tr><td class="e-pad" style="padding:0 8px 20px">
<a href="${esc(site)}" style="text-decoration:none">
<img class="e-logo-light" src="${esc(logo("light"))}" width="136" height="42" alt="Between Gigs" style="display:block;width:136px;height:42px;border:0;color:${light.ink};font-family:${FONT_DISPLAY};font-size:20px;font-weight:600">
<!--[if !mso]><!--><div class="e-logo-dark" style="display:none;max-height:0;overflow:hidden;mso-hide:all"><img src="${esc(logo("dark"))}" width="136" height="42" alt="Between Gigs" style="display:block;width:136px;height:42px;border:0;color:${dark.ink};font-family:${FONT_DISPLAY};font-size:20px;font-weight:600"></div><!--<![endif]-->
</a>
</td></tr>
<tr><td class="e-card" bgcolor="${light.surface}" style="background-color:${light.surface};border:1px solid ${light.line};border-radius:20px;overflow:hidden">
${body}
</td></tr>
<tr><td class="e-pad" style="padding:24px 16px 8px;font-family:${FONT_UI};font-size:12px;line-height:18px;color:${light.inkSubtle}">
<p class="e-subtle" style="margin:0 0 8px;color:${light.inkSubtle}">${esc(reason)}</p>
<p class="e-subtle" style="margin:0 0 8px;color:${light.inkSubtle}">Between Gigs · 11766 Wilshire Blvd · Los Angeles, CA 90025</p>
<p class="e-subtle" style="margin:0;color:${light.inkSubtle}"><a class="e-link" href="mailto:hello@between-gigs.com" style="color:${light.link}">Contact us</a> &nbsp;·&nbsp; <a class="e-link" href="${esc(site)}/privacy" style="color:${light.link}">Privacy</a> &nbsp;·&nbsp; <a class="e-link" href="mailto:hello@between-gigs.com?subject=Unsubscribe%20from%20Between%20Gigs%20updates" style="color:${light.link}">Unsubscribe</a></p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/** The forest band at the top of the card: eyebrow, headline with a mint accent. Forest in both themes. */
export function hero({ eyebrow, title, accent }: { eyebrow: string; title: string; accent?: string }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${light.surfaceBrand}" style="background-color:${light.surfaceBrand};border-radius:19px 19px 0 0;border-collapse:separate;border-spacing:0">
<tr><td class="e-pad" style="padding:40px 44px 36px;font-family:${FONT_UI}">
<p style="margin:0 0 14px;font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${dark.inkBrand}">${esc(eyebrow)}</p>
<h1 class="e-h1" style="margin:0;font-family:${FONT_DISPLAY};font-size:36px;line-height:42px;font-weight:600;letter-spacing:-0.02em;color:${dark.ink}">${esc(title)}${accent ? `<br><span style="color:${dark.inkBrand}">${esc(accent)}</span>` : ""}</h1>
</td></tr>
</table>`;
}

export const section = (inner: string, pad = "32px 44px 8px") => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="e-pad" style="padding:${pad};font-family:${FONT_UI}">${inner}</td></tr></table>`;

export const p = (html: string, opts: { muted?: boolean; size?: number; mb?: number } = {}) =>
  `<p class="${opts.muted ? "e-muted" : "e-ink"}" style="margin:0 0 ${opts.mb ?? 16}px;font-size:${opts.size ?? 16}px;line-height:${Math.round((opts.size ?? 16) * 1.6)}px;color:${opts.muted ? light.inkMuted : light.ink}">${html}</p>`;

export const h2 = (text: string) =>
  `<h2 class="e-ink" style="margin:8px 0 12px;font-family:${FONT_DISPLAY};font-size:18px;line-height:24px;font-weight:600;color:${light.ink}">${esc(text)}</h2>`;

/** A bulletproof button: the padding lives on the cell, so Outlook desktop keeps the size. */
export function button(href: string, label: string, variant: "primary" | "secondary" = "primary") {
  const primary = variant === "primary";
  const bg = primary ? light.action : light.surface;
  const fg = primary ? light.onAction : light.ink;
  const border = primary ? light.action : light.lineStrong;
  return `<table role="presentation" class="e-btn" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px"><tr>
<td align="center" class="${primary ? "" : "e-card"}" bgcolor="${bg}" style="background-color:${bg};border:1px solid ${border};border-radius:10px;mso-padding-alt:14px 28px">
<a href="${esc(href)}" class="${primary ? "" : "e-ink"}" style="display:inline-block;padding:14px 28px;font-family:${FONT_UI};font-size:16px;line-height:20px;font-weight:700;color:${fg};text-decoration:none;border-radius:10px">${esc(label)}&nbsp;&rarr;</a>
</td></tr></table>`;
}

export const link = (href: string, label: string) => `<a class="e-link" href="${esc(href)}" style="color:${light.link};text-decoration:underline">${esc(label)}</a>`;

/** Numbered rows ("01 About you …"), the same numbering the builder uses. */
export function steps(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px">${rows.map(([t, d], i) => `<tr>
<td valign="top" width="44" class="e-line" style="padding:14px 0;border-top:1px solid ${light.line};font-family:${FONT_MONO};font-size:13px;line-height:22px;color:${light.inkBrand}"><span class="e-brand" style="color:${light.inkBrand}">0${i + 1}</span></td>
<td valign="top" class="e-line" style="padding:14px 0;border-top:1px solid ${light.line};font-family:${FONT_UI}"><p class="e-ink" style="margin:0;font-size:15px;line-height:22px;font-weight:700;color:${light.ink}">${esc(t)}</p><p class="e-muted" style="margin:2px 0 0;font-size:14px;line-height:21px;color:${light.inkMuted}">${esc(d)}</p></td>
</tr>`).join("")}</table>`;
}

export function signature(lines = ["Patti & Peter", "Founders, Between Gigs"]) {
  return `<p class="e-ink" style="margin:24px 0 2px;font-size:16px;line-height:24px;font-weight:700;color:${light.ink}">${esc(lines[0])}</p>${lines.slice(1).map((l) => `<p class="e-muted" style="margin:0;font-size:14px;line-height:20px;color:${light.inkMuted}">${esc(l)}</p>`).join("")}`;
}

export const spacer = (h: number) => `<div style="height:${h}px;line-height:${h}px;font-size:1px">&nbsp;</div>`;

/** The plain-text twin's footer. */
export const textFooter = (reason: string, site: string) =>
  `—\n${reason}\nBetween Gigs · 11766 Wilshire Blvd · Los Angeles, CA 90025\nContact us: hello@between-gigs.com\nPrivacy: ${site}/privacy\nUnsubscribe: email hello@between-gigs.com with the subject "Unsubscribe from Between Gigs updates".`;

/** A full-width image inside the card, optionally linked. Width/height attributes keep Outlook from blowing it up. */
export function image({ src, alt, width = 512, height, href, caption }: { src: string; alt: string; width?: number; height: number; href?: string; caption?: string }) {
  const img = `<img src="${esc(src)}" width="${width}" height="${height}" alt="${esc(alt)}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;border-radius:14px;color:${light.inkMuted};font-family:${FONT_UI};font-size:14px">`;
  return `${href ? `<a href="${esc(href)}" style="text-decoration:none">${img}</a>` : img}${caption ? `<p class="e-subtle" style="margin:8px 0 0;font-family:${FONT_UI};font-size:12px;line-height:18px;color:${light.inkSubtle}">${esc(caption)}</p>` : ""}`;
}
