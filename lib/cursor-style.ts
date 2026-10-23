import { basePath } from "@/lib/site";

/**
 * Pointer shapes (/preview/cursors): a normal shape and one for things you can click, as SVGs in public/cursors.
 * The client chose the 3D arrow ("Spotlit 3D arrow", 23 Oct), so it's the site's cursor for everyone. The others stay on the preview page
 * to compare: picking one there overrides it in that browser only. "system" turns custom cursors off. Text fields
 * keep the text cursor, and touch screens never see a pointer.
 */
export type CursorStyle = "system" | "arrow-3d" | "spotlit" | "iris" | "crosshair" | "widescreen" | "halo" | "spot-arrow" | "arrow" | "spotlight" | "viewfinder" | "comet" | "tape";
export const SITE_CURSOR: CursorStyle = "arrow-3d";

export const cursorStyles: { id: Exclude<CursorStyle, "system">; name: string; body: string; hot: [number, number] }[] = [
  { id: "arrow-3d", name: "Spotlit 3D arrow", body: "A 3D navigation arrow with lit facets and a glow at its tip. Over links, REC lights.", hot: [4, 4] },
  { id: "spotlit", name: "Spotlit viewfinder", body: "Framing corners around a pool of light. Over links they close in and REC lights.", hot: [16, 16] },
  { id: "iris", name: "Lens iris", body: "Two arcs of a camera lens around a pool of light. Over links the arcs tighten like a lens focusing, and REC lights.", hot: [16, 16] },
  { id: "crosshair", name: "Spotlit crosshair", body: "A thin crosshair with an open centre in a soft glow. Over links it pulls in and REC lights.", hot: [16, 16] },
  { id: "widescreen", name: "Widescreen frame", body: "Wide 16:9 framing corners, like a film frame, around an oval of light. Over links they close in and REC lights.", hot: [16, 16] },
  { id: "halo", name: "Halo dot", body: "The most minimal: a mint dot in its own glow. Over links a ring appears and the dot turns red.", hot: [16, 16] },
  { id: "spot-arrow", name: "Spotlit arrow", body: "The familiar arrow with a pool of light at its tip. Over links it turns white and a small REC dot lights.", hot: [5, 3] },
  { id: "arrow", name: "Mint arrow", body: "The classic arrow in brand mint, outlined so it reads on light and dark. Over links it gets a soft halo.", hot: [5, 3] },
  { id: "spotlight", name: "Spotlight", body: "A dot in a thin ring, like a follow spot. Over links the ring fills.", hot: [16, 16] },
  { id: "viewfinder", name: "Viewfinder", body: "Camera framing corners. Over links they close in and a red REC dot lights.", hot: [16, 16] },
  { id: "comet", name: "Shooting star", body: "A small arrowhead with a tail, the comet from the horizon.", hot: [3, 3] },
  { id: "tape", name: "Tape mark", body: "The T an actor hits on set. Over links it turns to an X: you've found your mark.", hot: [16, 8] },
];

const KEY = "bg-cursor-style";
const EVENT = "bg-cursor-style-change";
const file = (id: string, hover = false) => `${basePath}/cursors/${id}${hover ? "-hover" : ""}.svg`;

/** The CSS value for a style's normal or hover cursor, with a system fallback. */
export function cursorValue(id: Exclude<CursorStyle, "system">, hover = false) {
  const s = cursorStyles.find((c) => c.id === id)!;
  return `url("${file(id, hover)}") ${s.hot[0]} ${s.hot[1]}, ${hover ? "pointer" : "auto"}`;
}

/** The style sheet that applies a style to the whole page (text fields keep their text cursor). */
export function cursorCss(id: CursorStyle) {
  if (id === "system") return "";
  return `html, body { cursor: ${cursorValue(id)}; }
a, button, summary, label, select, [role=button], [role=switch], [role=tab], [role=menuitem], [role=option] { cursor: ${cursorValue(id, true)} !important; }
input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, [contenteditable=true] { cursor: text !important; }`;
}

/** The cursor this browser uses: a preview choice from /preview/cursors, or the site's Spotlit 3D arrow. */
export function savedCursorStyle(): CursorStyle {
  try { const v = localStorage.getItem(KEY); return v === "system" || cursorStyles.some((c) => c.id === v) ? (v as CursorStyle) : SITE_CURSOR; } catch { return SITE_CURSOR; }
}
/** Saves a preview choice; the site's own cursor clears it. */
export function saveCursorStyle(id: CursorStyle) {
  try { if (id === SITE_CURSOR) localStorage.removeItem(KEY); else localStorage.setItem(KEY, id); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(EVENT));
}
export function onCursorStyleChange(fn: () => void) {
  window.addEventListener(EVENT, fn); window.addEventListener("storage", fn);
  return () => { window.removeEventListener(EVENT, fn); window.removeEventListener("storage", fn); };
}
