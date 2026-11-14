/**
 * How a work sample sits in its thumbnails (Justin, 14 Nov 2026): the Gigster aligns the photo, but the upload itself
 * is never cropped, so a buyer opening it in the lightbox sees the whole image at its own ratio. The alignment rides
 * on the photo's link as a fragment, "<src>#fit=cx,cy,z,a" (centre x/y as fractions of the image, zoom ≥ 1, image
 * width/height), so it moves with the photo through reorder, replace and remove, and anything that only loads the
 * link (an <img>, the lightbox) ignores it. Work samples are browser-only fields (lib/data/api.ts LOCAL_ONLY_FIELDS).
 */
export type Fit = { cx: number; cy: number; z: number; a: number };
/** A rectangle inside the image, as fractions of its width and height. */
export type Rect = { x: number; y: number; w: number; h: number };

const FIT = /#fit=([\d.]+),([\d.]+),([\d.]+),([\d.]+)$/;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number) => Math.round(v * 10000) / 10000;

/** The photo itself (no fragment) and its alignment, if one was saved. */
export function parseSample(sample: string): { src: string; fit: Fit | null } {
  const m = FIT.exec(sample);
  if (!m) return { src: sample, fit: null };
  const [cx, cy, z, a] = m.slice(1).map(Number);
  const ok = [cx, cy, z, a].every(Number.isFinite) && z >= 1 && a > 0;
  return { src: sample.slice(0, m.index), fit: ok ? { cx: clamp(cx, 0, 1), cy: clamp(cy, 0, 1), z: Math.min(z, 4), a } : null };
}

/** The photo with this alignment (replacing any earlier one). */
export const withFit = (sample: string, fit: Fit) =>
  `${parseSample(sample).src}#fit=${round(fit.cx)},${round(fit.cy)},${round(fit.z)},${round(fit.a)}`;

/**
 * The part of the image a frame of aspect `frame` (width/height) shows: the largest rectangle of that shape that fits
 * the image, made smaller by the zoom, centred on the chosen point and kept inside the image.
 */
export function rectFor(fit: Fit, frame: number): Rect {
  const w1 = fit.a >= frame ? frame / fit.a : 1;
  const h1 = fit.a >= frame ? 1 : fit.a / frame;
  const w = w1 / fit.z, h = h1 / fit.z;
  return { x: clamp(fit.cx - w / 2, 0, 1 - w), y: clamp(fit.cy - h / 2, 0, 1 - h), w, h };
}

/** Inline style that makes an absolutely positioned <img> show exactly `r` of itself across its frame. */
export const rectStyle = (r: Rect) => ({
  width: `${100 / r.w}%`, height: `${100 / r.h}%`, left: `${(-r.x / r.w) * 100}%`, top: `${(-r.y / r.h) * 100}%`, maxWidth: "none",
});
