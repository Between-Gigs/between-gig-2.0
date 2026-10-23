/**
 * The home page's dot field as a 3D gravity well. The dots are a flat sheet; the pointer is a mass that sinks it
 * into a funnel, depth = DEPTH / (1 + (distance / CORE)²), seen in perspective from slightly above and in front:
 *  - each dot is projected (x, y, depth) → screen, so dots down the funnel crowd together and shrink;
 *  - the slope is lit from the top left, so the near-left wall of the funnel catches light and the far wall dims;
 *  - grid lines join the dots where the sheet bends, so the funnel reads as a surface (a spacetime mesh);
 *  - the throat (deeper than SHADOW) fades into darkness, leaving an open space under the pointer.
 * When the pointer leaves, the well eases flat again. The field fades toward the top of the frame, as before.
 *
 * Mouse only; under reduced motion (or on touch) the field is drawn once, flat, and stays still. Colour comes from
 * --fx-ink (app/globals.css), so it follows Day and Night.
 */
const GAP = 14;          // grid spacing, px
const CORE = 85;         // width of the well, px
const DEPTH = 260;       // how deep the well sinks at its centre, px
const FOCAL = 520;       // perspective distance, px (smaller = stronger perspective)
const TILT = 0.38;       // how much depth shows as a downward shift (viewed from above and in front)
const SHADOW = 0.55;     // how far down the well (0 to 1) the sheet starts fading into the dark throat

export function startGravityField(host: HTMLElement): () => void {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
  host.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0, h = 0, cols = 0, rows = 0, dots: Float32Array = new Float32Array(0), ink = "seagreen";
  // Projected positions and strength per dot, reused each frame for the mesh lines.
  let px = new Float32Array(0), py = new Float32Array(0), pq = new Float32Array(0), pl = new Float32Array(0);
  // The mass: where the pointer is (target), where the well is (eased), and how heavy it is right now (0 to 1).
  const m = { tx: 0, ty: 0, x: 0, y: 0, s: 0, ts: 0 };
  let raf = 0;

  const readInk = () => { ink = getComputedStyle(host).getPropertyValue("--fx-ink").trim() || ink; };
  const layout = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = host.clientWidth; h = host.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / GAP) + 1; rows = Math.ceil(h / GAP) + 1;
    px = new Float32Array(cols * rows); py = new Float32Array(cols * rows); pq = new Float32Array(cols * rows); pl = new Float32Array(cols * rows);
    // x, y, and a base strength that fades toward the top and the sides.
    dots = new Float32Array(cols * rows * 3);
    let k = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * GAP, y = r * GAP;
        const down = y / h, side = Math.abs(x / w - 0.5) * 2;
        const base = Math.min(1, 0.12 + Math.pow(down, 1.6) * 0.95) * (1 - side * side * 0.35);
        dots[k++] = x; dots[k++] = y; dots[k++] = base;
      }
    }
  };

  const draw = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = ink; ctx.strokeStyle = ink;
    const s = m.s, core2 = CORE * CORE, depthMax = DEPTH * s;
    // Light from the top left, slightly towards the viewer.
    const lx = -0.55, ly = -0.65, lz = 0.52;
    for (let i = 0, k = 0; k < dots.length; i++, k += 3) {
      let x = dots[k], y = dots[k + 1];
      const base = dots[k + 2];
      let a = base * 0.42, r = 0.75, q = 0, lit = 0;
      if (s > 0.002) {
        const dx = x - m.x, dy = y - m.y, d2 = dx * dx + dy * dy;
        q = 1 / (1 + d2 / core2);
        const z = depthMax * q;                                          // depth of the sheet here
        // Slope of the funnel wall (dz/dx, dz/dy) gives the surface normal for the lighting.
        const g = 2 * depthMax * q * q / core2, nl = Math.hypot(g * dx, g * dy, 1);
        lit = Math.max(0, (-g * dx * lx - g * dy * ly + lz) / nl);
        // Perspective: deeper points shrink toward the centre of the well and drop a little (seen from above).
        const p = FOCAL / (FOCAL + z);
        // The drop is measured against the centre's, so the throat stays right under the pointer.
        const centre = depthMax * FOCAL / (FOCAL + depthMax) * TILT;
        x = m.x + dx * p; y = m.y + dy * p + z * TILT * p - centre * q;
        const fade = q > SHADOW ? Math.max(0, 1 - (q - SHADOW) / 0.25) : 1;
        a = (base * 0.42 + q * s * (0.25 + 0.95 * lit)) * fade;
        r = 0.75 + 1.1 * q * s * lit;
        q *= s * fade; lit *= fade;
      }
      px[i] = x; py[i] = y; pq[i] = q; pl[i] = lit;
      if (a < 0.02) continue;
      ctx.globalAlpha = Math.min(1, a);
      if (r < 1) ctx.fillRect(x - r, y - r, r * 2, r * 2);
      else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    }
    // The funnel's mesh: grid lines join the dots where the sheet bends, so the well reads as a surface.
    if (s > 0.02) {
      ctx.lineWidth = 0.8;
      const seg = (i: number, j: number) => {
        const q = Math.min(pq[i], pq[j]);
        if (q < 0.05) return;
        ctx.globalAlpha = Math.min(0.85, q * (0.18 + 0.7 * (pl[i] + pl[j]) / 2));
        ctx.beginPath(); ctx.moveTo(px[i], py[i]); ctx.lineTo(px[j], py[j]); ctx.stroke();
      };
      const c0 = Math.max(0, Math.floor((m.x - CORE * 4.5) / GAP)), c1 = Math.min(cols - 1, Math.ceil((m.x + CORE * 4.5) / GAP));
      const r0 = Math.max(0, Math.floor((m.y - CORE * 4.5) / GAP)), r1 = Math.min(rows - 1, Math.ceil((m.y + CORE * 4.5) / GAP));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const i = r * cols + c;
        if (c < c1) seg(i, i + 1);
        if (r < r1) seg(i, i + cols);
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 1;
  };

  const frame = () => {
    raf = 0;
    m.x += (m.tx - m.x) * 0.12; m.y += (m.ty - m.y) * 0.12; m.s += (m.ts - m.s) * 0.08;
    draw();
    const moving = Math.abs(m.tx - m.x) > 0.2 || Math.abs(m.ty - m.y) > 0.2 || Math.abs(m.ts - m.s) > 0.002;
    if (moving) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  const move = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || still) return;
    const r = host.getBoundingClientRect();
    m.tx = e.clientX - r.left; m.ty = e.clientY - r.top;
    if (m.s < 0.01) { m.x = m.tx; m.y = m.ty; }
    m.ts = 1; kick();
  };
  const leave = () => { m.ts = 0; kick(); };

  readInk(); layout(); draw();
  const ro = new ResizeObserver(() => { layout(); draw(); });
  ro.observe(host);
  // Day/Night flips the ink colour.
  const mo = new MutationObserver(() => { readInk(); draw(); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  host.addEventListener("pointermove", move, { passive: true });
  host.addEventListener("pointerleave", leave);
  return () => {
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect(); mo.disconnect();
    host.removeEventListener("pointermove", move);
    host.removeEventListener("pointerleave", leave);
    canvas.remove();
  };
}
