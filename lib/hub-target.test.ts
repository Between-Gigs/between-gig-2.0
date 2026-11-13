import { describe, expect, it } from "vitest";
import { hubTarget } from "./hub-target";
describe("Hub compatibility destinations", () => {
  it.each([["/preview/", "/hub/"], ["/preview/preview/", "/hub/"], ["/preview/wallpapers/?x=1", "/hub/preview/wallpapers/?x=1"], ["/preview/preview/cursors/", "/hub/preview/cursors/"], ["/hub/profile/canvas/", "/hub/profile/canvas/"], ["//evil.test/", "/hub/"], ["/preview/%2e%2e/api/", "/hub/"], ["/preview/%2f%2fevil.test/", "/hub/"], ["https://evil.test/", "/hub/"]])("maps %s to %s", (raw, expected) => { expect(hubTarget(raw)).toBe(expected); });
});
