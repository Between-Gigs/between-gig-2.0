import { describe, expect, it } from "vitest";
import { emailTemplateHref, ownerEmailPreview, ownerPreviewLink } from "./owner-email-preview";

describe("owner email preview navigation", () => {
  it("opens the live owner diagnostic and email area", () => {
    expect(ownerEmailPreview("live")).toEqual({ href: "/owners/emails/", label: "Emails", hint: "Diagnostic and previews", fullPage: false });
  });
  it("keeps sample links local so Next applies Pages or Hub basePath once", () => {
    expect(ownerEmailPreview("sample")).toEqual({ href: "/emails/", label: "Email previews", hint: "Sample only · no sending", fullPage: false });
  });
});

describe("owner preview destinations", () => {
  it("keeps new live preview destinations inside the sample Hub", () => {
    for (const path of ["/preview/", "/preview/forms/", "/preview/funnels/", "/preview/design-system/", "/preview/wallpapers/"]) {
      expect(ownerPreviewLink("live", path)).toEqual({ href: `/hub${path}`, fullPage: true });
      expect(ownerPreviewLink("sample", path)).toEqual({ href: path, fullPage: false });
    }
  });
});

describe("email template anchor destinations", () => {
 it("preserves local, Hub and Pages paths while live templates use the Hub", () => {
  for (const base of ["", "/hub", "/between-gig-2.0"]) expect(emailTemplateHref("sample", "invite", base)).toBe(`${base}/emails/invite/`);
  expect(emailTemplateHref("live", "invite")).toBe("/owners/emails/?template=invite");
 });
});
