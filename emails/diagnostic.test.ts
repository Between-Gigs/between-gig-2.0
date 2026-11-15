import { describe, expect, it } from "vitest";
import { diagnostic } from "./diagnostic";
import { FOOTER_ADDRESS_LINE } from "./config";
describe("diagnostic email", () => {
  it("uses the existing wallpaper, branded shell and shared footer without invitation actions", () => {
    const mail = diagnostic();
    expect(mail.subject).toContain("DIAGNOSTIC");
    expect(mail.html).toContain("/email/craft-invitation-portrait.jpg");
    expect(mail.html).toContain("/email/between-gigs-wide-on-light.png");
    expect(mail.html).toContain(FOOTER_ADDRESS_LINE);
    expect(mail.text).toContain(FOOTER_ADDRESS_LINE);
    expect(mail.html).not.toMatch(/invite=|Create your profile|RESEND_UNSUBSCRIBE_URL/);
    expect(mail.text).toContain("Provider acceptance does not prove inbox delivery");
  });
});
