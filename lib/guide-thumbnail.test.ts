import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { prepareGuideThumbnail } from "./guide-thumbnail";

function boot(thumbnail: boolean) {
  const shared = new Map([["bg2-sample-v2", "outer session"]]);
  const outer = { getItem: (key: string) => shared.get(key) ?? null, setItem: (key: string, value: string) => shared.set(key, value) };
  const window = {
    localStorage: outer, sessionStorage: outer, frameElement: { hasAttribute: () => thumbnail },
    parent: { document: { documentElement: { dataset: { look: "swiss", theme: "dark" } } } },
  };
  const document = { documentElement: { dataset: {} } };
  runInNewContext(prepareGuideThumbnail, { window, document });
  return { window, document, outer };
}

describe("passive guide frames", () => {
  it("inherits appearance and isolates both storage areas from the viewing account", () => {
    const { window, document, outer } = boot(true);
    expect(document.documentElement.dataset).toHaveProperty("guideThumbnail");
    expect(document.documentElement).toHaveProperty("inert", true);
    expect(window.localStorage.getItem("bg2-site-look-v2")).toBe("swiss");
    expect(window.localStorage.getItem("bg-theme")).toBe("dark");
    expect(window.localStorage.getItem("bg2-sample-v2")).toBeNull();
    window.localStorage.setItem("bg2-sample-v2", "sample owner");
    expect(window.sessionStorage.getItem("bg2-sample-v2")).toBeNull();
    expect(outer.getItem("bg2-sample-v2")).toBe("outer session");
  });
  it("leaves an ordinary embedded app alone", () => {
    const { window, document, outer } = boot(false);
    expect(document.documentElement.dataset).not.toHaveProperty("guideThumbnail");
    expect(window.localStorage).toBe(outer);
  });
});
