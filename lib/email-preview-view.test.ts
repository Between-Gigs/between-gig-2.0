import { describe, expect, it } from "vitest";
import { previewDevice, previewView, previewGeometry, previewViewport } from "./email-preview-view";

describe("email preview presentation", () => {
  it("accepts only known view and device state", () => {
    expect(previewView("list")).toBe("list");
    expect(previewView("unknown")).toBe("thumbnails");
    expect(previewDevice("phone")).toBe("phone");
    expect(previewDevice("javascript:bad")).toBe("desktop");
  });
  it("keeps actual document viewports independent of visual scaling", () => {
    expect(previewViewport("desktop")).toBe(640);
    expect(previewViewport("phone")).toBe(390);
    expect(previewGeometry(300, 640, 1600, "full")).toEqual({ scale: 300 / 640, height: 750, left: 0 });
  });
  it("fits the complete long email in a thumbnail and centers it", () => {
    expect(previewGeometry(300, 640, 1600, "thumbnails")).toEqual({ scale: .15, height: 240, left: 102 });
  });
  it("shrinks when a long document is replaced by a short one without enlarging it", () => {
    expect(previewGeometry(800, 640, 1600, "full").height).toBe(1600);
    expect(previewGeometry(800, 640, 300, "full")).toEqual({ scale: 1, height: 300, left: 80 });
  });
});
