"use client";
import { Button, Modal, Slider } from "@ds/components";
import { Check } from "lucide-react";
import * as React from "react";
import { asset } from "@/lib/site";
import { parseSample, rectFor, rectStyle, type Fit } from "@/lib/profile/work-fit";

/** The editor's work-sample thumbnail shape. */
export const THUMB = 16 / 9;

/**
 * Adjust the fit of a work sample (Justin, 14 Nov 2026): the whole upload at its own ratio, with the thumbnail's
 * 16:9 frame over it (the rest dimmed, thirds lines inside). Drag the frame, or use the arrow keys; zoom makes it
 * smaller. The live preview shows the thumbnail. Saving stores only the alignment: buyers who open the photo in the
 * lightbox still see all of it.
 */
export function FitCropper({ sample, onCancel, onSave }: { sample: string; onCancel: () => void; onSave: (fit: Fit) => void }) {
  const { src, fit: saved } = parseSample(sample);
  const [fit, setFit] = React.useState<Fit | null>(saved);
  const stage = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ px: number; py: number; cx: number; cy: number } | null>(null);
  React.useEffect(() => {
    if (saved) return;
    let live = true;
    const i = new Image();
    i.onload = () => { if (live) setFit({ cx: 0.5, cy: 0.5, z: 1, a: i.naturalWidth / i.naturalHeight }); };
    i.src = asset(src);
    return () => { live = false; };
  }, [src, saved]);
  // Keep the frame inside the photo: its centre can move only as far as half its size from each edge.
  const settle = (f: Fit): Fit => {
    const r = rectFor({ ...f, cx: 0.5, cy: 0.5 }, THUMB);
    return { ...f, cx: Math.min(1 - r.w / 2, Math.max(r.w / 2, f.cx)), cy: Math.min(1 - r.h / 2, Math.max(r.h / 2, f.cy)) };
  };
  const r = fit ? rectFor(fit, THUMB) : null;
  const pct = (v: number) => `${v * 100}%`;
  return (
    <Modal open onClose={onCancel} size="lg" title="Adjust the fit"
      description="Drag the frame over your photo, or zoom, to choose what the thumbnail shows. Buyers who open the photo still see all of it."
      footer={<><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button variant="primary" iconStart={<Check />} disabled={!fit} onClick={() => fit && onSave(fit)}>Save fit</Button></>}>
      <div className="grid gap-6 sm:grid-cols-5 sm:items-start">
        <div className="grid gap-4 sm:col-span-3">
          <div ref={stage} role="application" tabIndex={0} aria-label="Thumbnail frame. Drag it, or use the arrow keys to move it."
            className="relative mx-auto w-full cursor-grab touch-none overflow-hidden rounded-md bg-surface-sunken outline-none select-none focus-visible:ring-2 focus-visible:ring-ink-brand active:cursor-grabbing"
            style={fit ? { aspectRatio: String(fit.a), maxWidth: `calc(var(--spacing) * ${Math.round(96 * fit.a)})` } : { aspectRatio: "16 / 9" }}
            onPointerDown={(e) => { if (!fit) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, cx: fit.cx, cy: fit.cy }; }}
            onPointerMove={(e) => {
              const d = drag.current, box = stage.current?.getBoundingClientRect();
              if (!d || !box || !fit) return;
              setFit(settle({ ...fit, cx: d.cx + (e.clientX - d.px) / box.width, cy: d.cy + (e.clientY - d.py) / box.height }));
            }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
            onKeyDown={(e) => {
              if (!fit) return;
              const step = e.shiftKey ? 0.1 : 0.02, m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
              if (m[e.key]) { e.preventDefault(); setFit(settle({ ...fit, cx: fit.cx + m[e.key][0], cy: fit.cy + m[e.key][1] })); }
              if (e.key === "+" || e.key === "=") setFit(settle({ ...fit, z: Math.min(3, fit.z + 0.1) }));
              if (e.key === "-") setFit(settle({ ...fit, z: Math.max(1, fit.z - 0.1) }));
            }}>
            <img src={asset(src)} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full" />
            {r && (
              <>
                {/* Everything outside the frame is dimmed. */}
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 bg-forest-950/60" style={{ height: pct(r.y) }} />
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 bg-forest-950/60" style={{ height: pct(1 - r.y - r.h) }} />
                <span aria-hidden="true" className="pointer-events-none absolute left-0 bg-forest-950/60" style={{ top: pct(r.y), height: pct(r.h), width: pct(r.x) }} />
                <span aria-hidden="true" className="pointer-events-none absolute right-0 bg-forest-950/60" style={{ top: pct(r.y), height: pct(r.h), width: pct(1 - r.x - r.w) }} />
                {/* The frame, with thirds lines to line things up. */}
                <span data-fit-frame aria-hidden="true" className="pointer-events-none absolute ring-2 ring-white" style={{ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) }}>
                  {[1, 2].map((n) => <span key={`v${n}`} className="absolute inset-y-0 w-px bg-white/60" style={{ left: pct(n / 3) }} />)}
                  {[1, 2].map((n) => <span key={`h${n}`} className="absolute inset-x-0 h-px bg-white/60" style={{ top: pct(n / 3) }} />)}
                </span>
              </>
            )}
          </div>
          <Slider label="Zoom" min={1} max={3} step={0.01} value={fit?.z ?? 1} disabled={!fit}
            onChange={(z) => fit && setFit(settle({ ...fit, z }))} format={(v) => `${Math.round(v * 100)}%`} />
        </div>
        <div className="grid content-start gap-2 sm:col-span-2">
          <p className="text-label-md text-ink">Thumbnail preview</p>
          <div data-fit-preview className="relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-surface-sunken">
            {r && <img src={asset(src)} alt="How the thumbnail will look" draggable={false} className="absolute" style={rectStyle(r)} />}
          </div>
          <p className="text-body-sm text-ink-muted">This is how the photo shows on your profile. Opened, it shows whole.</p>
        </div>
      </div>
    </Modal>
  );
}
