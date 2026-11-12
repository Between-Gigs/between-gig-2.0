import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { firstPaintLook, hasSiteLook, isBrandPage } from "./look";

function beforePaint(pathname: string, read: () => string | null) {
  const dataset: { look?: string } = {};
  runInNewContext(firstPaintLook, {
    document: { documentElement: { dataset } }, location: { pathname }, localStorage: { getItem: read },
  });
  return dataset.look;
}

describe("initial site appearance", () => {
  it("restores the chosen design on deep links, with a friendly fallback", () => {
    for (const saved of ["swiss", "classic", "friendly"]) {
      expect(beforePaint("/p/maya/", () => saved)).toBe(saved);
    }
    expect(beforePaint("/", () => null)).toBe("friendly");
    expect(beforePaint("/preview/", () => "retired")).toBe("friendly");
    expect(beforePaint("/join/", () => { throw new Error("Storage unavailable"); })).toBe("friendly");
  });

  it("keeps the original public brand typography apart from the product theme", () => {
    for (const path of ["/", "/professionals", "/storyboard/", "/crew-call/", "/proposals/home/"]) {
      expect(isBrandPage(path)).toBe(true);
    }
    for (const path of ["/profile/", "/preview/", "/join/", "/storyboard-notes/"]) {
      expect(isBrandPage(path)).toBe(false);
    }
  });

  it("keeps the internal tools outside the site design on load and navigation", () => {
    for (const path of ["/workspace/", "/studio/site/", "/_journal"]) {
      expect(beforePaint(path, () => "swiss")).toBeUndefined();
      expect(hasSiteLook(path)).toBe(false);
    }
    expect(hasSiteLook("/studio-notes/")).toBe(true);
  });
});
