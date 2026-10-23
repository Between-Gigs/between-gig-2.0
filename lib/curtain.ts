/**
 * The home page's stage curtain: a curved screen of dots that hangs like fabric (pleats, lit folds, dots crowding
 * into the creases) above a still, dotted floor, with the glowing horizon where the curtain's hem meets the floor.
 * The pointer brushes the cloth (a bulge and a wave that follow the pointer's movement and settle); open() parts the
 * curtain to both sides, gathering it at the edges, then calls back so the page can move on.
 *
 * Every look-and-feel number is a CurtainParams field, tuned live on /preview/curtain. Mouse only for brushing; under
 * reduced motion it never animates (open() calls back at once). Colours come from --fx-ink and --fx-glow, so it
 * follows Day and Night.
 */
export type CurtainParams = {
  spacing: number;      // dot spacing on the cloth, px
  dotSize: number;      // dot size multiplier
  folds: number;        // pleats across the curtain
  foldDepth: number;    // how far the pleats swing in and out
  crowd: number;        // how much the dots crowd into the creases
  flare: number;        // 0 = even pleats, 1 = pleats deepen fully toward the hem
  contrast: number;     // light/shade difference between fold faces
  light: number;        // light direction on the folds (phase, radians)
  topFade: number;      // how quickly the cloth fades toward the top
  brushRadius: number;  // reach of the pointer, px
  brushStrength: number;// how hard the pointer pushes the cloth
  waveSize: number;     // ripple wavelength, px
  waveSpeed: number;    // ripple speed
  settle: number;       // how fast the cloth settles (0.8 slow to 0.99 very slow)
  openMs: number;       // opening duration, ms
  gather: number;       // how far the halves slide (0.5 to 1 = fully to the edges)
  bunch: number;        // how tightly the cloth bunches as it gathers
  stageLight: number;   // glow revealed behind the curtain as it opens
  curve: number;        // screen curvature (lower = more curved)
  horizon: number;      // horizon height (share of the frame from the top)
  floor: number;        // floor dot spacing multiplier
  floorFade: number;    // how quickly the floor fades toward the viewer
  glow: number;         // horizon glow strength
};

export const curtainDefaults: CurtainParams = {
  spacing: 10.5, dotSize: 1, folds: 26, foldDepth: 0.03, crowd: 1.6, flare: 0.65, contrast: 0.82, light: 0.9, topFade: 1.1,
  brushRadius: 150, brushStrength: 1, waveSize: 26, waveSpeed: 4, settle: 0.95,
  openMs: 1400, gather: 0.92, bunch: 2.6, stageLight: 0.5,
  curve: 0.55, horizon: 0.8, floor: 1.4, floorFade: 1.6, glow: 1,
};

export type CurtainController = { stop: () => void; open: (done: () => void) => void; reset: () => void; redraw: () => void };

export function startCurtain(host: HTMLElement, params: () => CurtainParams): CurtainController {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
  host.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0, h = 0, ink = "seagreen", glow = "seagreen";
  // Pointer: position, smoothed velocity, and the cloth's energy (0 still to 1 fully stirred).
  const pt = { x: -9999, y: -9999, vx: 0, vy: 0, e: 0, last: 0 };
  let openT = 0, opening: { start: number; done: () => void } | null = null, raf = 0;
  const t0 = performance.now();

  const readInk = () => {
    const cs = getComputedStyle(host);
    ink = cs.getPropertyValue("--fx-ink").trim() || ink;
    glow = cs.getPropertyValue("--fx-glow").trim() || glow;
  };
  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = host.clientWidth; h = host.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = (now: number) => {
    if (!ctx) return;
    const p = params(), time = (now - t0) / 1000;
    ctx.clearRect(0, 0, w, h);
    const R = 1000, f = Math.max(w * p.curve, h * (p.curve + 0.2)), cx = w / 2, cy = h * 0.42;
    const camH = (h * p.horizon - cy) * R / f, top = (cy + 40) * R / f, k0 = f / R;
    const proj = (X: number, Y: number, Z: number) => ({ x: cx + (X * f) / Z, y: cy - (Y * f) / Z, k: f / Z });
    const th0 = Math.atan((w / 2 + 60) / f) + 0.12;
    const open = openT < 0.5 ? 2 * openT * openT : 1 - Math.pow(-2 * openT + 2, 2) / 2; // ease in-out

    // Stage light behind the curtain, revealed as it opens.
    if (open > 0 && p.stageLight > 0) {
      const g = ctx.createRadialGradient(cx, h * 0.62, 0, cx, h * 0.62, w * 0.42);
      g.addColorStop(0, glow); g.addColorStop(1, "transparent");
      ctx.globalAlpha = p.stageLight * open; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }

    // Floor: still dots on the floor plane, inside the screen's circle, fading toward the viewer.
    ctx.fillStyle = ink;
    const st = p.spacing * p.floor * R / f, zN = (f * camH) / (h * 1.05 - cy);
    for (let Z = R; Z >= zN; Z -= st) {
      const half = Math.sqrt(R * R - Z * Z);
      for (let X = -Math.floor(half / st) * st; X <= half; X += st) {
        if (X * X + Z * Z > R * R) continue;
        const q = proj(X, -camH, Z);
        if (q.x < -20 || q.x > w + 20 || q.y > h + 20) continue;
        const toward = (R - Math.hypot(X, Z)) / (R - zN);
        const a = 0.8 * Math.pow(1 - Math.min(1, toward), p.floorFade);
        if (a < 0.02) continue;
        ctx.globalAlpha = a;
        const r = Math.min(2.2, 0.8 * Math.sqrt(q.k / k0)) * p.dotSize;
        ctx.fillRect(q.x - r, q.y - r, r * 2, r * 2);
      }
    }

    // Curtain.
    const dT = p.spacing * 0.8 / f, dY = p.spacing * 0.8 * R / f, rad2 = 2 * p.brushRadius * p.brushRadius;
    const sp = Math.hypot(pt.vx, pt.vy) || 1, dirx = pt.vx / sp, diry = pt.vy / sp;
    for (let t = -th0; t <= th0; t += dT) {
      const side = t < 0 ? -1 : 1, u = Math.abs(t) / th0;
      const tu = 1 - (1 - u) * (1 - open * p.gather);
      const bunch = 1 + open * p.bunch * (1 - u);
      const ph = side * tu * th0 * p.folds * bunch;
      for (let Y = -camH; Y <= top; Y += dY) {
        const up = (Y + camH) / (top + camH);
        const flare = 1 - p.flare + p.flare * (1 - up);
        const tt = side * tu * th0 - Math.sin(ph) * dT * p.crowd * flare * bunch;
        const depth = Math.cos(ph) * flare * bunch;
        const rr = R * (1 - p.foldDepth * depth);
        const hem = up < 0.02 ? -Math.abs(Math.sin(ph)) * 8 * R / f : 0;
        const q = proj(rr * Math.sin(tt), Y + hem, rr * Math.cos(tt));
        if (q.x < -30 || q.x > w + 30 || q.y < -20 || q.y > h + 20) continue;
        const face = Math.sin(ph + p.light), shade = 1 - p.contrast + p.contrast * Math.pow(0.5 + 0.5 * face, 1.6);
        let a = (0.35 + 0.65 * Math.pow(1 - up, p.topFade)) * shade, x = q.x, y = q.y;
        if (pt.e > 0.003) {
          const dx = x - pt.x, dy = y - pt.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
          const env = pt.e * p.brushStrength * Math.exp(-d2 / rad2), wave = Math.sin(d / p.waveSize - time * p.waveSpeed);
          const hemW = 0.5 + 0.7 * (1 - up);
          x += env * (24 * dirx * (0.6 + 0.4 * wave) + 12 * Math.sin(y / 34 + ph + time * p.waveSpeed)) * hemW;
          y += env * (10 * diry * (0.6 + 0.4 * wave) + 4 * Math.cos(d / p.waveSize)) * hemW;
          a *= 1 + env * 0.9 * (0.5 + 0.5 * wave);
        }
        if (a < 0.02) continue;
        ctx.globalAlpha = Math.min(1, a);
        const r = Math.min(2.4, 0.8 * Math.sqrt(q.k / k0)) * (0.7 + 0.45 * shade) * p.dotSize;
        if (r < 1.1) ctx.fillRect(x - r, y - r, r * 2, r * 2);
        else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      }
    }

    // Horizon: the hem line where the curtain meets the floor, with its glow.
    const base: { x: number; y: number }[] = [];
    for (let t = -th0 - 0.1; t <= th0 + 0.1; t += 0.01) base.push(proj(R * Math.sin(t), -camH, R * Math.cos(t)));
    const line = () => { ctx.beginPath(); base.forEach((b, i) => (i ? ctx.lineTo(b.x, b.y) : ctx.moveTo(b.x, b.y))); ctx.stroke(); };
    ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = glow;
    for (const [lw, al] of [[60, 0.05], [26, 0.09], [9, 0.18]] as const) { ctx.globalAlpha = Math.min(1, al * p.glow); ctx.lineWidth = lw; line(); }
    ctx.globalAlpha = Math.min(1, 0.9 * Math.max(0.3, p.glow)); ctx.lineWidth = 1.2; ctx.strokeStyle = ink; ctx.shadowColor = glow; ctx.shadowBlur = 12 * p.glow; line();
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  const frame = (now: number) => {
    raf = 0;
    const p = params();
    if (opening) {
      openT = Math.min(1, (now - opening.start) / p.openMs);
      if (openT >= 1) { const done = opening.done; opening = null; draw(now); done(); return; }
    }
    pt.e *= p.settle;
    if (pt.e < 0.003) pt.e = 0;
    draw(now);
    if (opening || pt.e > 0) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  const move = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || still) return;
    const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now();
    if (pt.last && now - pt.last < 120) {
      const dt = Math.max(8, now - pt.last), vx = (x - pt.x) / dt, vy = (y - pt.y) / dt;
      pt.vx = pt.vx * 0.7 + vx * 0.3; pt.vy = pt.vy * 0.7 + vy * 0.3;
      pt.e = Math.min(1, pt.e + Math.hypot(vx, vy) * 0.06);
    }
    pt.x = x; pt.y = y; pt.last = now;
    kick();
  };

  readInk(); size(); draw(performance.now());
  const ro = new ResizeObserver(() => { size(); draw(performance.now()); });
  ro.observe(host);
  const mo = new MutationObserver(() => { readInk(); draw(performance.now()); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  host.addEventListener("pointermove", move, { passive: true });
  return {
    stop: () => { if (raf) cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); host.removeEventListener("pointermove", move); canvas.remove(); },
    open: (done) => { if (still) { done(); return; } opening = { start: performance.now(), done }; kick(); },
    reset: () => { opening = null; openT = 0; draw(performance.now()); },
    redraw: () => draw(performance.now()),
  };
}
