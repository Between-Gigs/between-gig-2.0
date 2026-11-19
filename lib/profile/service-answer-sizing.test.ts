import { describe, expect, it } from "vitest";
import { fitLegacyServiceAnswer, usesLegacyServiceAnswerSizing } from "./service-answer-sizing";

describe("service answer sizing fallback", () => {
  it("leaves native sizing in charge when supported, including after mount", () => {
    expect(usesLegacyServiceAnswerSizing({ supports: (property, value) => property === "field-sizing" && value === "content" })).toBe(false);
    expect(usesLegacyServiceAnswerSizing({ supports: () => false })).toBe(true);
    expect(usesLegacyServiceAnswerSizing(undefined)).toBe(true);
  });

  it("grows, shrinks, and refits after wrapping changes without changing the answer", () => {
    const style = { height: "" };
    const value = "Fictional answer, unchanged.";
    const box = {
      value, style, offsetWidth: 350, contentHeight: 78,
      get clientHeight() { return Math.max(78, parseInt(this.style.height, 10) - 2 || 0); },
      get offsetHeight() { return this.clientHeight + 2; },
      get scrollHeight() { return Math.max(this.clientHeight, this.contentHeight); },
    };
    fitLegacyServiceAnswer(box);
    expect(style.height).toBe("80px");
    box.contentHeight = 118;
    fitLegacyServiceAnswer(box);
    expect(style.height).toBe("120px");
    box.offsetWidth = 160;
    box.contentHeight = 158;
    fitLegacyServiceAnswer(box);
    expect(style.height).toBe("160px");
    box.contentHeight = 78;
    fitLegacyServiceAnswer(box);
    expect(style.height).toBe("80px");
    expect(box.value).toBe(value);
  });

  it("does not measure a hidden field", () => {
    const box = { style: { height: "90px" }, offsetWidth: 0, offsetHeight: 0, clientHeight: 0, scrollHeight: 0 };
    fitLegacyServiceAnswer(box);
    expect(box.style.height).toBe("90px");
  });
});
