import { describe, expect, it } from "vitest";
import { ownerEmailPreview, ownerPreviewLink } from "./owner-email-preview";

describe("owner email preview navigation", () => {
  it("crosses from live owners to the separately served Hub, not the absent live /emails route", () => {
    expect(ownerEmailPreview("live")).toEqual({ href: "/hub/emails/", label: "Email previews", hint: "Sample only · no sending", fullPage: true });
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
