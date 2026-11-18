import { describe, expect, it } from "vitest";
import { INVITE_COPY, INVITE_REASON, INVITE_UNSUBSCRIBE, invite } from "@/emails/invite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { INVITE_HERO } from "@/emails/invite-hero";
import { renderPreview } from "@/components/emails/preview";

const props = { inviteUrl: "https://example.test/join/?invite=sample&source=email", email: "sample@example.test" };

describe("canonical Stage 2 invitation", () => {
  it("matches Patti invitation07–10 in HTML and text with a sentence-case signoff", () => {
    const email=invite(props);
    expect(email.text).toContain("Your skills have value beyond the set.\nLet us help you put them to work.");
    expect(email.html).toContain("Your skills have value beyond the set. Let us help you put them to work.");
    expect(email.text).toContain("and begin connecting you with new opportunities in the coming weeks.");
    expect(INVITE_HERO.geometry).toMatchObject({logoWidth:235.2,eyebrowFontSize:22});
    expect(email.text).toContain("The Between Gigs Team");
    expect(email.html).toMatch(/letter-spacing:0\.04em;color:[^>]+>The Between Gigs Team<\/p>/);
    expect(email.html).not.toContain("YOUR BETWEEN GIGS TEAM");
  });

  it("keeps the approved copy order with matching hero and body actions and removes extra claims", () => {
    const email = invite(props);
    const phrases = [INVITE_COPY.lead, INVITE_COPY.opening, INVITE_COPY.stage, INVITE_COPY.introduction,
      `${INVITE_COPY.nextTitle} ${INVITE_COPY.next}`, INVITE_COPY.ready, INVITE_COPY.cta.toUpperCase(), INVITE_COPY.closing];
    let position = -1;
    for (const phrase of phrases) {
      const next = email.text.indexOf(phrase, position + 1);
      expect(next, phrase).toBeGreaterThan(position);
      position = next;
    }
    expect(email.html.match(/>Create your profile/g)).toHaveLength(1);
    expect(email.html).toContain('alt="Create your profile.');
    expect(email.text.split(props.inviteUrl)).toHaveLength(3);
    expect(email.html.match(/href="https:\/\/example.test\/join\/\?invite=sample&amp;source=email"/g)).toHaveLength(3);
    expect(email.html).toContain("?invite=sample&amp;source=email");
    expect(email.html).toContain(`<strong>${INVITE_COPY.stage}</strong>`);
    expect(email.html).toContain(`<strong>${INVITE_COPY.nextTitle}</strong> ${INVITE_COPY.next}`);
    for (const removed of ["10 minutes", "What you'll need", "It goes live", "works for 30 days", "Let the journey begin"]) {
      expect(email.text).not.toContain(removed);
      expect(email.html).not.toContain(removed);
    }
  });

  it("links the exact approved hero image without live text over artwork", () => {
    const html = invite(props).html;
    expect(html).toContain('class="e-invite-artwork"');
    expect(html).toContain('/email/invitation-hero-approved.png');
    expect(html).toContain('width="598" height="784"');
    expect(html).not.toContain('class="e-invite-scene"');
    expect(html).not.toContain('class="e-k-card"');
    expect(html).not.toContain('class="e-k-strip"');
    expect(html).not.toContain("DESIGN CONCEPT");
  });

  it("retains Resend's send-time macro and the verified footer without a personal token", () => {
    const email = invite(props);
    expect(email.html).toContain(`href="${INVITE_UNSUBSCRIBE}"`);
    expect(email.text).toContain(`Unsubscribe: ${INVITE_UNSUBSCRIBE}`);
    for (const value of [INVITE_REASON, "Between Gigs · 11766 Wilshire Blvd, Los Angeles, CA 90025", "https://between-gigs.com/privacy"]) {
      expect(email.html).toContain(value);
      expect(email.text).toContain(value);
    }
    expect(email.html).toContain('href="mailto:hello@between-gigs.com"');
    expect(email.html).toContain(">Contact support</a>");
  });

  it("uses the sending environment for privacy links in both twins",()=>{const email=invite(props,{assetBase:"https://test.example",siteUrl:"https://test.example"});expect(email.html).toContain('href="https://test.example/privacy/"');expect(email.text).toContain("Privacy: https://test.example/privacy/");});

  it("keeps each sending transport's unsubscribe placeholder explicit", () => {
    expect(INVITE_UNSUBSCRIBE).toBe("{{{RESEND_UNSUBSCRIBE_URL}}}");
    const email = invite({ ...props, unsubscribeUrl: "{{links.unsubscribe}}" });
    expect(email.html).toContain('href="{{links.unsubscribe}}"');
    expect(email.text).toContain("Unsubscribe: {{links.unsubscribe}}");
    expect(email.html).not.toContain("RESEND_UNSUBSCRIBE_URL");
    const preview = renderPreview("invite", { ...props, unsubscribeUrl: "{{links.unsubscribe}}" }, "light");
    expect(preview.html).not.toContain('href="{{links.unsubscribe}}"');
    expect(preview.text).not.toContain("{{links.unsubscribe}}");
    expect(preview.text).toContain("inactive in this sample");
  });

  it("disables sample unsubscribing while retaining the template macro for actual HTML", () => {
    const email = renderPreview("invite", props, "dark");
    expect(email.html).toContain('<span data-email-unsubscribe aria-disabled="true"');
    expect(email.html).not.toContain(INVITE_UNSUBSCRIBE);
    expect(email.text).toContain("inactive in this sample");
    expect(invite(props).html).toContain(INVITE_UNSUBSCRIBE);
  });

  it("prefers light while pairing readable HTML surface and text fallbacks without selective colour-lock hacks", () => {
    const email = invite(props);
    expect(email.html).toContain('name="color-scheme" content="light"');
    expect(email.html).toContain("@media (prefers-color-scheme:dark)");
    expect(email.html).toContain("[data-ogsc]");
    expect(email.html).toContain('<html lang="en" dir="ltr"');
    expect(email.html).not.toContain("background-image:linear-gradient");
    expect(email.html).not.toContain("-webkit-text-fill-color");
    expect(email.html).toContain(".e-invite-email .e-invite-html-cta a{color:#ffffff!important}");
    expect(email.html.match(/<h1/g)).toHaveLength(1);
  });

  it("binds the baked hero bytes and copy to their approved provenance",()=>{
    const image=readFileSync(new URL("../public/email/invitation-hero-approved.png",import.meta.url));
    expect(createHash("sha256").update(image).digest("hex")).toBe(INVITE_HERO.sha256);
    expect(image.readUInt32BE(16)).toBe(INVITE_HERO.width);
    expect(image.readUInt32BE(20)).toBe(INVITE_HERO.height);
    expect(INVITE_HERO.copy).toEqual({eyebrow:INVITE_COPY.eyebrow,title:[...INVITE_COPY.title],lead:INVITE_COPY.lead,cta:INVITE_COPY.cta});
    const html=invite(props,{assetBase:"https://test.example",siteUrl:"https://test.example"}).html;
    expect(html).toContain('src="https://test.example/email/invitation-hero-approved.png"');
  });

  it("uses an approved mobile raster with readable baked text at the narrowest actual 260px frame",()=>{
    const mobile=INVITE_HERO.mobile;
    expect(mobile.width).toBe(260);expect(mobile.height).toBe(340);
    expect(mobile.geometry).toMatchObject({titleFontSize:21,leadFontSize:12,ctaFontSize:12,logoWidth:88});
    for(const width of [260,298,318,388]){
      expect(mobile.geometry.leadFontSize*width/mobile.width).toBeGreaterThanOrEqual(12);
      expect(mobile.geometry.ctaFontSize*width/mobile.width).toBeGreaterThanOrEqual(12);
    }
    const image=readFileSync(new URL("../public/email/invitation-hero-approved-mobile.png",import.meta.url));
    expect(createHash("sha256").update(image).digest("hex")).toBe(mobile.sha256);
    expect(image.readUInt32BE(16)).toBe(mobile.width);expect(image.readUInt32BE(20)).toBe(mobile.height);
    expect(mobile.copy).toEqual(INVITE_HERO.copy);
    const html=invite(props).html;
    expect(html).toContain('class="e-invite-mobile"');
    expect(html).toContain('display:none;max-height:0;overflow:hidden;mso-hide:all');
    expect(html).toContain('@media (max-width:620px)');
    expect(html).toContain('.e-invite-email .e-invite-desktop{display:none!important;max-height:0!important;overflow:hidden!important}');
    expect(html).toContain('.e-invite-email .e-invite-mobile{display:block!important;max-height:none!important;overflow:visible!important}');
  });
});
