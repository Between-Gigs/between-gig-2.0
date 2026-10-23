/*
 * The client demo (/demo): get started (with an optional invite) → sign up → build a profile → see it. Everything stays in this browser's
 * sample store. A flag in localStorage keeps the demo bar on while they move through the real pages.
 */
const KEY = "bg2-demo-flow";
const CHANGE = "bg2-demo-flow";

export const demoSteps = ["Get started", "Sign up", "Build your profile", "See your profile"] as const;

export function demoActive() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}
export function setDemoActive(on: boolean) {
  try { if (on) localStorage.setItem(KEY, "1"); else localStorage.removeItem(KEY); } catch { /* ignore */ }
  window.dispatchEvent(new Event(CHANGE));
}
export function onDemoChange(fn: () => void) {
  window.addEventListener(CHANGE, fn);
  return () => window.removeEventListener(CHANGE, fn);
}

/** Which step a path belongs to, or -1 outside the demo's pages. */
export function demoStepFor(path: string) {
  const p = path.endsWith("/") ? path : `${path}/`;
  if (p.startsWith("/demo/")) return 0;
  if (p.startsWith("/join/") || p.startsWith("/login/")) return 1;
  if (p.startsWith("/profile/edit/")) return 2;
  if (p.startsWith("/profile/") || p.startsWith("/p/")) return 3;
  return -1;
}
