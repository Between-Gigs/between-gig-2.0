/** Baked artwork and copy are reviewed together; the contract test verifies this exact asset. */
import { INVITE_HERO } from "./invite-artwork";
import { esc, type EmailContext } from "./layout";
export { INVITE_HERO };

export function invitationHero(inviteUrl: string, ctx: EmailContext) {
  const c = INVITE_HERO.copy;
  const alt = `${c.cta}. ${c.eyebrow} to Between Gigs. ${c.title.join(" ")} ${c.lead.replace("\n", " ")}`;
  return `<h1 class="e-invite-artwork" style="margin:0;font-size:18px;line-height:26px;font-weight:400">
<a class="e-invite-desktop" href="${esc(inviteUrl)}" style="display:block;text-decoration:none;color:#0f3d29">
<img src="${esc(ctx.assetBase)}/email/invitation-hero-approved.jpg" width="${INVITE_HERO.width}" height="${INVITE_HERO.height}" alt="${esc(alt)}" style="display:block;width:100%;max-width:598px;height:auto;border:0;color:#0f3d29;font-family:Figtree,'Segoe UI',Helvetica,Arial,sans-serif;font-size:18px;line-height:26px">
</a>
<a class="e-invite-mobile" href="${esc(inviteUrl)}" style="display:none;max-height:0;overflow:hidden;mso-hide:all;text-decoration:none;color:#0f3d29">
<img src="${esc(ctx.assetBase)}/email/invitation-hero-approved-mobile.jpg" width="${INVITE_HERO.mobile.width}" height="${INVITE_HERO.mobile.height}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;border:0;color:#0f3d29;font-family:Figtree,'Segoe UI',Helvetica,Arial,sans-serif;font-size:18px;line-height:26px;mso-hide:all">
</a></h1>`;
}
