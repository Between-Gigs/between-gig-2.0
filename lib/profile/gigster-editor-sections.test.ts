import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CanvasColumns, CanvasDetails } from "@/components/gigster/editor/canvas";
import { blankFields } from "@/lib/data/fields";

const props = { set: vi.fn(() => vi.fn()), errors: {} };
const columns = (fields: ReturnType<typeof blankFields> = blankFields()) =>
  renderToStaticMarkup(React.createElement(CanvasColumns, { ...props, d: fields, required: () => false }));
const details = (fields: ReturnType<typeof blankFields>) =>
  renderToStaticMarkup(React.createElement(CanvasDetails, { ...props, d: fields }));

describe("Gigster canvas question and details visibility", () => {
  it("shows all four choices on a new draft without mounting an answer field", () => {
    const html = columns();
    expect(html.match(/name="f-personality-q"/g) ?? []).toHaveLength(4);
    expect(html).not.toContain('id="f-personality"');
  });

  it("preserves a legacy answer and only shows it after assigning a question", () => {
    const legacy = { ...blankFields(), personality: "A saved fictional answer." };
    expect(columns(legacy)).not.toContain('id="f-personality"');
    const assigned = columns({ ...legacy, personalityQuestion: "bucket-list" });
    expect(assigned).toContain('id="f-personality"');
    expect(assigned).toContain(legacy.personality);
    expect(legacy.personalityQuestion).toBeUndefined();
  });

  it("keeps insurance controls hidden and does not open Details based on those fields", () => {
    const legacy = { ...blankFields(), insurance: "yes" as const, insuranceNotes: "Fictional private note" };
    expect(details(legacy)).toContain('id="f-details-open"');
    const open = details({ ...legacy, tools: "Lights" });
    expect(open).toContain('id="f-tools"');
    expect(open).not.toContain('name="f-insurance"');
    expect(open).not.toContain('id="f-insurance-notes"');
    expect(open).not.toContain(legacy.insuranceNotes);
  });
});
