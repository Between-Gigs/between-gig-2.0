import { describe, expect, it } from "vitest";
import { INVITE_COPY, INVITE_REASON, INVITE_UNSUBSCRIBE, invite } from "@/emails/invite";
import { renderPreview } from "@/components/emails/preview";

const props = { inviteUrl: "https://example.test/join/?invite=sample&source=email", email: "sample@example.test" };

describe("canonical Stage 2 invitation", () => {
  it("keeps the approved copy order with one primary action and removes extra claims", () => {
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
    expect(email.html).toContain("?invite=sample&amp;source=email");
    expect(email.html).toContain(`<strong>${INVITE_COPY.stage}</strong>`);
    expect(email.html).toContain(`<strong>${INVITE_COPY.nextTitle}</strong> ${INVITE_COPY.next}`);
    for (const removed of ["10 minutes", "What you'll need", "It goes live", "works for 30 days", "Let the journey begin"]) {
      expect(email.text).not.toContain(removed);
      expect(email.html).not.toContain(removed);
    }
  });

  it("places live hero text directly on the existing clear-center wallpaper", () => {
    const html = invite(props).html;
    expect(html).toContain('class="e-invite-scene"');
    expect(html).toContain('/email/craft-invitation-portrait.jpg');
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

  it("disables sample unsubscribing while retaining the template macro for actual HTML", () => {
    const email = renderPreview("invite", props, "dark");
    expect(email.html).toContain('<span data-email-unsubscribe aria-disabled="true"');
    expect(email.html).not.toContain(INVITE_UNSUBSCRIBE);
    expect(email.text).toContain("inactive in this sample");
    expect(invite(props).html).toContain(INVITE_UNSUBSCRIBE);
  });

  it("opts the invitation into its intended light palette without promising forced-mode immunity", () => {
    const email = invite(props);
    expect(email.html).toContain('name="color-scheme" content="light"');
    expect(email.html).not.toContain("@media (prefers-color-scheme:dark)");
    expect(email.html).toContain('<html lang="en" dir="ltr"');
    expect(email.html.match(/<h1/g)).toHaveLength(1);
  });
});
