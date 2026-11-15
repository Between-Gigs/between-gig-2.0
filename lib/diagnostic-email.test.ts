import { describe, expect, it } from "vitest";
import { diagnostic } from "../emails/diagnostic";
import { FOOTER_ADDRESS_LINE } from "../emails/config";
describe("diagnostic email", () => {
  it("pairs every visible text block with coordinated dark colors and protects the original logo backing", () => {
    const html = diagnostic().html;
    expect(html).toContain('name="color-scheme" content="light dark"');
    expect(html).toContain('@media (prefers-color-scheme:dark)');
    expect(html).toContain('[data-ogsc] .e-diagnostic p');
    expect(html).toContain('.e-diagnostic p,.e-diagnostic h1,.e-diagnostic a{color:#f5f5f5!important}');
    expect(html).toContain('background-image:linear-gradient(#fbf8f2,#fbf8f2)');
    expect(html).toContain('class="e-d-logo"');
    expect(html).toContain('width:100%;max-width:600px');
    expect(html).not.toContain('padding:88px 60px');
    expect(html).not.toMatch(/color:#(?:0f3d29|4a5249|516253|086c42)[;"}]/);
  });
  it("keeps the existing wallpaper visible to classic Outlook conditional rendering", () => {
    // Simulate only the explicit !mso exclusion; this is not an Outlook application test.
    const classic = diagnostic().html.replace(/<!--\[if !mso\]><!-->[\s\S]*?<!--<!\[endif\]-->/g, "");
    expect(classic).toContain('/email/craft-invitation-desktop.jpg');
    expect(classic).toContain(FOOTER_ADDRESS_LINE);
  });
  it("uses the existing wallpaper, branded shell and shared footer without invitation actions", () => {
    const mail = diagnostic();
    expect(mail.subject).toContain("DIAGNOSTIC");
    expect(mail.html).toContain("/email/craft-invitation-desktop.jpg");
    expect(mail.html).toContain("/email/between-gigs-wide-on-light.png");
    expect(mail.html).toContain(FOOTER_ADDRESS_LINE);
    expect(mail.text).toContain(FOOTER_ADDRESS_LINE);
    expect(mail.html).not.toMatch(
      /invite=|Create your profile|RESEND_UNSUBSCRIBE_URL/,
    );
    expect(mail.text).toContain(
      "Provider acceptance does not prove inbox delivery",
    );
  });
});
