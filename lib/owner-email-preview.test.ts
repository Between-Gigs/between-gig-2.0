import { describe, expect, it } from "vitest";
import { ownerEmailPreview } from "./owner-email-preview";

describe("owner email preview navigation", () => {
  it("crosses from live owners to the separately served Hub, not the absent live /emails route", () => {
    expect(ownerEmailPreview("live")).toEqual({ href: "/hub/emails/", label: "Email previews", hint: "Sample only · no sending", fullPage: true });
  });
  it("keeps sample links local so Next applies Pages or Hub basePath once", () => {
    expect(ownerEmailPreview("sample")).toEqual({ href: "/emails/", label: "Email previews", hint: "Sample only · no sending", fullPage: false });
  });
});
