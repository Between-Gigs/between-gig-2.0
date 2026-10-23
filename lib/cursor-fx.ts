/**
 * Mouse effects for the site, to try and choose from (/preview/cursors). The choice is saved in this browser only
 * until the client picks one to ship. Every effect sits on top of the normal cursor (it never replaces it), is
 * mouse-only, and stays off when the visitor asks for reduced motion.
 */
export type CursorKind = "none" | "glow" | "ring" | "comet" | "dots" | "sparks";

export const cursorEffects: { id: Exclude<CursorKind, "none">; name: string; body: string }[] = [
  { id: "glow", name: "Mint glow", body: "A soft light follows the pointer, like a lamp over the set. Quiet; works on every page." },
  { id: "ring", name: "Focus ring", body: "A ring trails the pointer and grows over anything you can click, so buttons feel ready." },
  { id: "comet", name: "Comet trail", body: "A short tail behind the pointer, the shooting star from the horizon." },
  { id: "dots", name: "Phosphor dots", body: "Dots light up around the pointer, as if the dotted field reacts to it." },
  { id: "sparks", name: "Click sparks", body: "Nothing while you move; a small burst of mint where you click." },
];

const KEY = "bg-cursor";
const EVENT = "bg-cursor-change";

export function savedCursor(): CursorKind {
  try {
    const v = localStorage.getItem(KEY);
    return v && cursorEffects.some((e) => e.id === v) ? (v as CursorKind) : "none";
  } catch { return "none"; }
}
export function saveCursor(kind: CursorKind) {
  try { if (kind === "none") localStorage.removeItem(KEY); else localStorage.setItem(KEY, kind); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(EVENT));
}
export function onCursorChange(fn: () => void) {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => { window.removeEventListener(EVENT, fn); window.removeEventListener("storage", fn); };
}
export const cursorAllowed = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const INTERACTIVE = "a, button, [role=button], [role=switch], input, select, textarea, label, summary";

/**
 * Starts an effect over `scope` (an element) or the whole window, and returns a stop function. Colours come from
 * --fx-ink / --fx-glow (app/globals.css), so each effect follows Day and Night.
 */
export function startCursorFx(kind: CursorKind, scope?: HTMLElement): () => void {
  if (kind === "none") return () => {};
  const host = scope ?? document.body;
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, { position: scope ? "absolute" : "fixed", inset: "0", pointerEvents: "none", overflow: "hidden", zIndex: scope ? "1" : "60", borderRadius: "inherit" });
  host.appendChild(layer);
  const css = () => getComputedStyle(scope ?? document.documentElement);
  const color = (name: string) => css().getPropertyValue(name).trim() || "seagreen";

  // Pointer position in the layer's coordinates; `seen` false until the pointer is over the scope.
  const p = { x: 0, y: 0, ex: 0, ey: 0, seen: false, over: false };
  const local = (e: PointerEvent) => { const r = layer.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const target: EventTarget = scope ?? window;

  // Canvas effects share one sized, high-DPI canvas.
  let canvas: HTMLCanvasElement | null = null, ctx: CanvasRenderingContext2D | null = null, ro: ResizeObserver | null = null;
  if (kind === "comet" || kind === "dots" || kind === "sparks") {
    canvas = document.createElement("canvas");
    Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
    layer.appendChild(canvas);
    ctx = canvas.getContext("2d");
    const fit = () => { const dpr = Math.min(devicePixelRatio || 1, 2); canvas!.width = layer.clientWidth * dpr; canvas!.height = layer.clientHeight * dpr; ctx?.setTransform(dpr, 0, 0, dpr, 0, 0); };
    ro = new ResizeObserver(fit); ro.observe(layer); fit();
  }

  // DOM effects.
  let blob: HTMLDivElement | null = null;
  if (kind === "glow") {
    blob = document.createElement("div");
    Object.assign(blob.style, { position: "absolute", left: "0", top: "0", width: "420px", height: "420px", marginLeft: "-210px", marginTop: "-210px", borderRadius: "50%",
      background: "radial-gradient(circle, color-mix(in oklab, var(--fx-glow) 30%, transparent), transparent 68%)", opacity: "0", transition: "opacity 400ms ease", willChange: "transform" });
    layer.appendChild(blob);
  }
  if (kind === "ring") {
    blob = document.createElement("div");
    Object.assign(blob.style, { position: "absolute", left: "0", top: "0", width: "30px", height: "30px", marginLeft: "-15px", marginTop: "-15px", borderRadius: "50%",
      border: "1.5px solid var(--fx-ink)", background: "transparent", opacity: "0", transition: "opacity 300ms ease, scale 250ms cubic-bezier(.2,.8,.2,1), background-color 250ms ease", willChange: "transform" });
    layer.appendChild(blob);
  }

  const trail: { x: number; y: number; t: number }[] = [];
  const sparks: { x: number; y: number; vx: number; vy: number; t: number }[] = [];
  let raf = 0, last = performance.now();

  const frame = (now: number) => {
    raf = 0;
    const dt = Math.min(64, now - last); last = now;
    const k = 1 - Math.pow(1 - (kind === "ring" ? 0.22 : 0.14), dt / 16);
    p.ex += (p.x - p.ex) * k; p.ey += (p.y - p.ey) * k;
    let busy = Math.hypot(p.x - p.ex, p.y - p.ey) > 0.3;
    if (blob) blob.style.transform = `translate(${p.ex}px, ${p.ey}px)`;
    if (ctx && canvas) {
      const w = layer.clientWidth, h = layer.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const ink = color("--fx-ink");
      if (kind === "comet") {
        while (trail.length && now - trail[0].t > 320) trail.shift();
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1], b = trail[i], life = 1 - (now - b.t) / 320;
          ctx.strokeStyle = ink; ctx.globalAlpha = life * 0.8; ctx.lineWidth = 0.5 + life * 3.5; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        if (p.over) { ctx.globalAlpha = 1; ctx.fillStyle = ink; ctx.shadowColor = ink; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
        busy = busy || trail.length > 0;
      }
      if (kind === "dots" && p.over) {
        const R = 150, G = 14;
        ctx.fillStyle = ink;
        for (let x = Math.floor((p.ex - R) / G) * G; x <= p.ex + R; x += G) {
          for (let y = Math.floor((p.ey - R) / G) * G; y <= p.ey + R; y += G) {
            const d = Math.hypot(x - p.ex, y - p.ey); if (d > R) continue;
            const f = 1 - d / R;
            ctx.globalAlpha = f * f * 0.9; ctx.beginPath(); ctx.arc(x, y, 0.8 + f * 1.8, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      if (kind === "sparks") {
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i], age = (now - s.t) / 600;
          if (age >= 1) { sparks.splice(i, 1); continue; }
          s.x += s.vx * dt / 16; s.y += s.vy * dt / 16; s.vx *= 0.94; s.vy *= 0.94;
          ctx.globalAlpha = 1 - age; ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(s.x, s.y, 2.2 * (1 - age) + 0.4, 0, Math.PI * 2); ctx.fill();
        }
        busy = busy || sparks.length > 0;
      }
      ctx.globalAlpha = 1;
    }
    if (busy) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  const move = (ev: Event) => {
    const e = ev as PointerEvent;
    if (e.pointerType !== "mouse") return;
    const q = local(e);
    if (!p.seen) { p.ex = q.x; p.ey = q.y; p.seen = true; }
    p.x = q.x; p.y = q.y; p.over = true;
    if (blob) blob.style.opacity = "1";
    if (kind === "ring" && blob) {
      const hot = (e.target as Element | null)?.closest?.(INTERACTIVE);
      blob.style.scale = hot ? "1.7" : "1";
      blob.style.backgroundColor = hot ? "color-mix(in oklab, var(--fx-ink) 14%, transparent)" : "transparent";
    }
    if (kind === "comet") trail.push({ x: q.x, y: q.y, t: performance.now() });
    kick();
  };
  const leave = () => { p.over = false; if (blob) blob.style.opacity = "0"; kick(); };
  const down = (ev: Event) => {
    const e = ev as PointerEvent;
    if (kind !== "sparks" || e.pointerType !== "mouse") return;
    const q = local(e), now = performance.now();
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4, v = 2 + Math.random() * 3; sparks.push({ x: q.x, y: q.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: now }); }
    kick();
  };
  target.addEventListener("pointermove", move, { passive: true });
  target.addEventListener("pointerdown", down, { passive: true });
  (scope ?? document.documentElement).addEventListener("pointerleave", leave);
  return () => {
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerdown", down);
    (scope ?? document.documentElement).removeEventListener("pointerleave", leave);
    if (raf) cancelAnimationFrame(raf);
    ro?.disconnect();
    layer.remove();
  };
}
