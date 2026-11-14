import { describe, expect, it } from "vitest";
import { publicPreviewHref, publicPreviewTarget } from "./admin-preview";
describe("public-page preview boundaries", () => {
  it("rejects external, private and recursive destinations", () => {
    for (const value of ["https://example.com/", "//example.com/", "/\\example.com/", "/owners/", "/profile/canvas/", "/preview/page/", "/join/../owners/", "/api/forms/", "/media/private/"]) expect(publicPreviewTarget(value, "")).toBeNull();
  });
  it("preserves the original public destination including query and fragment", () => {
    const target = "/join/?next=%2Fprofile%2F#details";
    expect(publicPreviewTarget(target, "")).toBe(target);
    expect(publicPreviewHref(target, "")).toBe(`/preview/page/?path=${encodeURIComponent(target)}`);
    expect(publicPreviewHref("/emails/invite/", "")).toBe("/emails/invite/");
  });
  it("does not embed the Hub root recursively as a public homepage", () => {
    expect(publicPreviewTarget("/", "/hub")).toBeNull();
    expect(publicPreviewTarget("/home/", "/hub")).toBe("/home/");
    expect(publicPreviewTarget("/", "/between-gig-2.0")).toBe("/");
  });
});
