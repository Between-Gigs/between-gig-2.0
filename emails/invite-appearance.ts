/** Invitation-only fallback: artwork is one image; HTML surfaces and text change together. */
const dark = `
.e-invite-email.e-body,.e-invite-email.e-outer{background-color:#0b2e1f!important}
.e-invite-email .e-card,.e-invite-email .e-invite-paper{background-color:#133a28!important;border-color:#315640!important}
.e-invite-email .e-invite-paper p{color:#fbf8f2!important}
.e-invite-email .e-pad,.e-invite-email .e-subtle{color:#c5d6cc!important}
.e-invite-email .e-link{color:#bce4cf!important}
.e-invite-email .e-invite-html-cta td{background-color:#0f3d29!important}
.e-invite-email .e-invite-html-cta a{color:#ffffff!important}
.e-invite-email .e-invite-artwork a,.e-invite-email .e-invite-artwork img{color:#fbf8f2!important}
`;
const outlook = dark.trim().split("\n").map(rule => {
  const [selectors, declarations] = rule.split("{");
  return `${selectors.split(",").map(selector => `[data-ogsc] ${selector}`).join(",")}{${declarations}`;
}).join("\n");

export function invitationAppearance(html: string) {
  // The shared light-only output adds selective colour locks. Remove them only from this invitation.
  // Gmail may ignore author dark CSS and recolour HTML; keep its surfaces/text free to transform together.
  return html
    .replace(/-webkit-text-fill-color:#[0-9a-f]{3,8};?/gi, "")
    .replace(/background-image:linear-gradient\((#[0-9a-f]{3,8}),\1\);?/gi, "")
    .replace('class="e-body"', 'class="e-body e-invite-email"')
    .replace('class="e-outer"', 'class="e-outer e-invite-email"')
    .replace(/(<(?:div|table)\b)(?![^>]*\blang=)/g, '$1 lang="en" dir="ltr"')
    .replace("</style>", `.e-invite-email .e-invite-html-cta td{background-color:#0f3d29!important}\n.e-invite-email .e-invite-html-cta a{color:#ffffff!important}\n@media (max-width:624px){\n.e-invite-email .e-edge{padding-left:0!important;padding-right:0!important}\n}\n@media (max-width:620px){\n.e-invite-email .e-invite-desktop{display:none!important;max-height:0!important;overflow:hidden!important}\n.e-invite-email .e-invite-mobile{display:block!important;max-height:none!important;overflow:visible!important}\n}\n@media (prefers-color-scheme:dark){${dark}}\n${outlook}\n</style>`);
}
