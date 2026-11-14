import { describe, expect, it } from "vitest";
import { parseSample, rectFor, withFit } from "./work-fit";

describe("work sample fit", () => {
  const src = "data:image/jpeg;base64,AAAA";
  it("keeps the photo untouched and reads the alignment back", () => {
    const s = withFit(src, { cx: 0.3, cy: 0.6, z: 1.5, a: 1.5 });
    expect(parseSample(s)).toEqual({ src, fit: { cx: 0.3, cy: 0.6, z: 1.5, a: 1.5 } });
    expect(parseSample(withFit(s, { cx: 0.5, cy: 0.5, z: 1, a: 1.5 })).src).toBe(src); // replaced, not stacked
  });
  it("treats a photo without alignment, or a broken one, as centred", () => {
    expect(parseSample(src)).toEqual({ src, fit: null });
    expect(parseSample(`${src}#fit=1,1,0,1`).fit).toBeNull(); // zoom below 1
    expect(parseSample("/media/abc").src).toBe("/media/abc");
  });
  it("frames the largest rectangle of the frame's shape, zoomed and kept inside the image", () => {
    // A 3:2 photo in a 16:9 frame: full width, height 0.84.
    const r = rectFor({ cx: 0.5, cy: 0.5, z: 1, a: 1.5 }, 16 / 9);
    expect(r.w).toBeCloseTo(1); expect(r.h).toBeCloseTo(0.84375); expect(r.y).toBeCloseTo(0.078125);
    // A portrait photo, zoomed 2×, centred near the corner: clamped inside.
    const p = rectFor({ cx: 0, cy: 1, z: 2, a: 0.75 }, 16 / 9);
    expect(p.x).toBe(0); expect(p.y + p.h).toBeCloseTo(1); expect(p.w).toBeCloseTo(0.5);
  });
});
