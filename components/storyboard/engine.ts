/*
 * The Storyboard book: a port of the approved sketchbook's page turn
 * (imagine-os/between-gigs public/design-locks/approved-2026-09-27/storyboard.html).
 *
 * The leaf that turns is a real curved surface: a chain of nested strips whose tangent sweeps through an
 * arc, so the page bends the way paper bends instead of pivoting like a flat door. Drag it, tap either
 * half, or use the arrows / arrow keys. A spring settles the leaf; covers fade instead of curling.
 * The geometry (N, SPAN, BETA, spring constants, thresholds) is the original's, unchanged.
 */

export interface BookPage { url: string; title: string; story: string; cover: boolean }
export interface BookState { index: number; canPrev: boolean; canNext: boolean; zoom: number }

const N = 18;          // strips: enough for a smooth curve
const SPAN = 0.449;    // gutter → outer page edge, as a fraction of the book width
const BETA = 0.6;      // peak curl of the arc, radians
const TILT_X = 4.5, TILT_Y = 7;   // degrees: deliberately restrained
const ZOOM_MIN = 0.9, ZOOM_MAX = 1.5;

type Dir = "next" | "prev";

export function createBook(opts: {
  pages: BookPage[];
  stage: HTMLElement;
  frame: HTMLElement;   // the element that carries the CSS variables (.sb-3d)
  book: HTMLElement;
  captions: HTMLElement;
  reduced: boolean;
  onChange: (s: BookState) => void;
  onInteract?: () => void;
}) {
  const { pages, stage, frame, book, captions, reduced, onChange, onInteract } = opts;
  const M = pages.length;
  let idx = 0;
  let turn: { dir: Dir; from: number; to: number; t: number } | null = null;
  let strips: HTMLElement[] = [];
  let capOut: HTMLElement | null = null, capIn: HTMLElement | null = null;
  let coverTimer: number | null = null;

  const el = (tag: string, cls?: string) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
  const report = () => onChange({ index: turn ? turn.to : idx, canPrev: target("prev") !== null, canNext: target("next") !== null, zoom: view.tz });

  function half(pos: "left" | "right", i: number) {
    const d = el("div", `sb-half ${pos}`);
    const im = new Image(); im.className = `sb-half-img ${pos}`; im.draggable = false; im.alt = ""; im.src = pages[i].url;
    d.appendChild(im);
    d.appendChild(el("div", `gutter-shade ${pos}`));
    return d;
  }

  /* Build the strip chain once per turn; background offsets are pure geometry, so they never change while it animates. */
  function buildCurl(dir: Dir, from: number, to: number) {
    strips = [];
    const c = el("div", `curl ${dir}`);
    c.style.setProperty("--n", String(N));
    c.style.setProperty("--span", String(SPAN));
    let host: HTMLElement = c;
    for (let i = 0; i < N; i++) {
      const s = el("div", "strip");
      const gut = "calc(var(--bw) * 0.5)";
      const sw = `calc(var(--bw) * ${SPAN} / ${N})`;
      const A = `calc(-1 * (${gut} + ${i} * ${sw}))`;   // faces the from-page
      const B = `calc(${i + 1} * ${sw} - ${gut})`;      // faces the to-page
      const f = el("div", "face front"), b = el("div", "face back");
      const dress = (e: HTMLElement, url: string, px: string) => { e.style.backgroundImage = `url(${url})`; e.style.backgroundPositionX = px; };
      dress(f, pages[from].url, dir === "next" ? A : B);
      dress(b, pages[to].url, dir === "next" ? B : A);
      f.append(el("div", "sh"), el("div", "gl"));
      b.append(el("div", "sh"), el("div", "gl"));
      s.append(f, b);
      if (i === N - 1) s.classList.add("edge");
      host.appendChild(s); host = s;
      strips.push(s);
    }
    return c;
  }

  function applyTurn(t: number) {
    const th = Math.PI * t;                    // how far the leaf has swung
    const beta = BETA * Math.sin(Math.PI * t); // flat at both ends
    const D = 180 / Math.PI;
    const tt = th + beta, td = (2 * beta) / N;
    frame.style.setProperty("--tt", `${(tt * D).toFixed(2)}deg`);
    frame.style.setProperty("--td", `${(td * D).toFixed(3)}deg`);
    frame.style.setProperty("--shade", Math.sin(Math.PI * t).toFixed(3));
    fadeCaption(t);
    for (let i = 0; i < strips.length; i++) {
      const l1 = Math.abs(Math.cos(tt - i * td));        // facing at this strip's near edge
      const l2 = Math.abs(Math.cos(tt - (i + 1) * td));  // …and at its far edge
      const st = strips[i].style;
      st.setProperty("--lit", l1.toFixed(3));
      st.setProperty("--a1", ((1 - l1) * 0.62).toFixed(3));
      st.setProperty("--a2", ((1 - l2) * 0.62).toFixed(3));
    }
  }

  function caption() {
    captions.textContent = "";
    capOut = capIn = null;
    const make = (p: BookPage, live: boolean) => {
      const c = el("p", `sb-caption${live ? " live" : ""}`);
      const title = el("span", "sb-caption-title"); title.textContent = p.title; c.appendChild(title);
      if (p.story) { const story = el("span", "sb-caption-story"); story.textContent = p.story; c.appendChild(story); }
      return c;
    };
    if (turn) {
      capOut = make(pages[turn.from], true); capIn = make(pages[turn.to], true);
      capIn.setAttribute("aria-hidden", "true"); capOut.setAttribute("aria-hidden", "true");
      captions.append(capOut, capIn);
      fadeCaption(turn.t);
    } else {
      captions.appendChild(make(pages[idx], false));
    }
  }
  /* The old title is gone before the new one arrives, so they never overlap mid-drag. */
  function fadeCaption(t: number) {
    if (!capOut || !capIn) return;
    capOut.style.opacity = (1 - Math.max(0, Math.min(1, (t - 0.1) / 0.28))).toFixed(3);
    capIn.style.opacity = Math.max(0, Math.min(1, (t - 0.56) / 0.3)).toFixed(3);
  }

  function paint() {
    book.classList.remove("cover-leave", "cover-enter");
    book.textContent = "";
    if (!turn) {
      const f = el("div", "sb-full");
      const im = new Image(); im.src = pages[idx].url; im.alt = `${pages[idx].title}. ${pages[idx].story}`; im.draggable = false;
      f.appendChild(im); book.appendChild(f);
      frame.style.setProperty("--shade", "0");
    } else {
      const next = turn.dir === "next";
      book.appendChild(half("left", next ? turn.from : turn.to));
      book.appendChild(half("right", next ? turn.to : turn.from));
      book.appendChild(buildCurl(turn.dir, turn.from, turn.to));
      applyTurn(turn.t);
    }
    // Invisible halves to drag or tap. Hidden from assistive tech: the labelled arrows do the same job.
    for (const side of ["prev", "next"] as const) {
      const z = el("div", `sb-zone sb-${side}`); z.dataset.dir = side; z.setAttribute("aria-hidden", "true");
      book.appendChild(z);
    }
    layout();
    caption();
    report();
  }

  function layout() { frame.style.setProperty("--bw", `${book.clientWidth}px`); }

  /* ---- spring loop ---- */
  let spring: { v: number; target: number; done?: () => void; k: number; c: number } | null = null;
  let raf: number | null = null, last = 0;
  function animateTo(target: number, done: () => void, k = 150, c = 22) { spring = { v: 0, target, done, k, c }; kick(); }
  function tick(now: number) {
    raf = null;
    const dt = Math.min(0.032, (now - last) / 1000 || 0.016); last = now;
    if (spring && turn) {
      const s = spring;
      const x = turn.t - s.target;
      s.v += (-s.k * x - s.c * s.v) * dt;
      turn.t += s.v * dt;
      if (Math.abs(turn.t - s.target) < 0.002 && Math.abs(s.v) < 0.02) {
        turn.t = s.target; spring = null; applyTurn(turn.t); s.done?.();
      } else applyTurn(turn.t);
    }
    viewSpring();
    if ((spring || viewActive) && raf === null) raf = requestAnimationFrame(tick);
  }
  function kick() { if (raf === null) { last = performance.now(); raf = requestAnimationFrame(tick); } }

  /* ---- tilt and zoom of the book ---- */
  const view = { rx: 0, ry: 0, z: 1, trx: 0, try_: 0, tz: 1 };
  let viewActive = false;
  function applyView() {
    frame.style.setProperty("--rx", `${view.rx.toFixed(2)}deg`);
    frame.style.setProperty("--ry", `${view.ry.toFixed(2)}deg`);
    frame.style.setProperty("--zoom", view.z.toFixed(3));
  }
  function viewSpring() {
    let moved = false;
    for (const [k, t] of [["rx", "trx"], ["ry", "try_"], ["z", "tz"]] as const) {
      const d = view[t] - view[k];
      if (Math.abs(d) > 0.0006) { view[k] += d * 0.14; moved = true; } else view[k] = view[t];
    }
    if (moved) applyView();
    viewActive = moved;
  }
  function setView(rx: number, ry: number, z: number) {
    if (reduced) { view.rx = view.trx = 0; view.ry = view.try_ = 0; view.z = view.tz = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)); applyView(); report(); return; }
    view.trx = Math.max(-TILT_X, Math.min(TILT_X, rx));
    view.try_ = Math.max(-TILT_Y, Math.min(TILT_Y, ry));
    view.tz = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
    viewActive = true; kick(); report();
  }
  /* The book leans toward the cursor: never far, and not while a page is being turned. */
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch" || drag || reduced) return;
    const r = book.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
    const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.62)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.9)));
    setView(-ny * TILT_X, nx * TILT_Y, view.tz);
  };
  const onOut = (e: PointerEvent) => { if (!e.relatedTarget) setView(0, 0, view.tz); };
  const onBlur = () => setView(0, 0, view.tz);

  /* ---- turning ---- */
  function target(dir: Dir) {
    const base = turn ? turn.to : idx;
    const next = base + (dir === "next" ? 1 : -1);
    return next >= 0 && next < M ? next : null;
  }
  function startTurn(dir: Dir, t = 0) {
    spring = null;
    if (turn) { idx = turn.to; turn = null; }   // settle anything still in flight
    const to = target(dir); if (to === null) return false;
    turn = { dir, from: idx, to, t };
    paint(); return true;
  }
  function transitionCover(dir: Dir) {
    if (coverTimer !== null) return;
    const to = target(dir); if (to === null) return;
    if (reduced) { idx = to; turn = null; paint(); return; }
    book.classList.add("cover-leave");
    coverTimer = window.setTimeout(() => {
      idx = to; turn = null; paint(); book.classList.add("cover-enter");
      coverTimer = window.setTimeout(() => { book.classList.remove("cover-enter"); coverTimer = null; }, 350);
    }, 220);
  }
  function commit() {
    if (!turn) return;
    if (reduced) { idx = turn.to; turn = null; paint(); return; }
    animateTo(1, () => { if (turn) idx = turn.to; turn = null; paint(); }, 170, 26);
  }
  function cancel() {
    if (!turn) return;
    animateTo(0, () => { turn = null; paint(); }, 150, 24);
  }
  function step(dir: Dir) {
    if (turn) { idx = turn.to; turn = null; }   // finish whatever is in flight first
    const to = target(dir); if (to === null) return;
    onInteract?.();
    if (pages[idx].cover || pages[to].cover) { transitionCover(dir); return; }
    if (startTurn(dir)) commit();
  }
  function goTo(i: number) {
    if (turn) { idx = turn.to; turn = null; }
    if (i === idx || i < 0 || i >= M) return;
    if (Math.abs(i - idx) === 1) { step(i > idx ? "next" : "prev"); return; }
    idx = i; paint();
  }

  /* ---- pointer work ---- */
  let drag: { dir: Dir; x0: number; w: number; moved: number; vel: number; tPrev: number } | null = null;
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const zone = (e.target as HTMLElement).closest<HTMLElement>(".sb-zone");
    if (!zone) return;
    e.preventDefault();
    stage.setPointerCapture(e.pointerId);
    onInteract?.();
    const r = book.getBoundingClientRect();
    const dir: Dir = (e.clientX - r.left) / r.width > 0.5 ? "next" : "prev";
    const to = target(dir); if (to === null) return;
    if (pages[idx].cover || pages[to].cover) { transitionCover(dir); return; }
    if (!startTurn(dir)) return;
    drag = { dir, x0: e.clientX, w: r.width, moved: 0, vel: 0, tPrev: performance.now() };
  };
  const onDragMove = (e: PointerEvent) => {
    if (!drag || !turn) return;
    const dx = e.clientX - drag.x0;
    drag.moved = Math.max(drag.moved, Math.abs(dx));
    const t = Math.max(0, Math.min(1, (drag.dir === "next" ? -dx : dx) / (drag.w * 0.62)));
    const now = performance.now();
    drag.vel = (t - turn.t) / Math.max(0.001, (now - drag.tPrev) / 1000);
    drag.tPrev = now;
    turn.t = t; applyTurn(t);
  };
  const onUp = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!turn) return;
    if (d.moved < 6) { commit(); return; }          // a tap, not a drag
    if (turn.t > 0.42 || d.vel > 1.1) commit(); else cancel();
  };
  const noDrag = (e: Event) => e.preventDefault();

  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onDragMove);
  stage.addEventListener("pointerup", onUp);
  stage.addEventListener("pointercancel", onUp);
  stage.addEventListener("dragstart", noDrag);
  stage.addEventListener("dblclick", () => setView(view.trx, view.try_, 1));
  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("pointerout", onOut);
  addEventListener("blur", onBlur);
  addEventListener("resize", layout);

  // Warm the cache so the first turns don't flash.
  pages.forEach((p) => { const im = new Image(); im.src = p.url; });
  paint();

  return {
    step, goTo,
    zoom: (factor: number) => setView(view.trx, view.try_, view.tz * factor),
    destroy() {
      if (raf !== null) cancelAnimationFrame(raf);
      if (coverTimer !== null) clearTimeout(coverTimer);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onDragMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("dragstart", noDrag);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerout", onOut);
      removeEventListener("blur", onBlur);
      removeEventListener("resize", layout);
    },
  };
}
