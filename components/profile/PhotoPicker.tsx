"use client";
import { Button, Modal, Slider } from "@ds/components";
import { Check, Crop as CropIcon, ImagePlus, Trash2 } from "lucide-react";
import * as React from "react";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { data } from "@/lib/data";
import { useSession } from "@/lib/session";

const MAX = 800;
const SOURCE = 1600;

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const i = new Image();
  i.onload = () => resolve(i);
  i.onerror = () => reject(new Error("unreadable"));
  i.src = src;
});

/** Reads an image file into a data URL no larger than 1600px, the source the cropper works from. */
async function readFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, SOURCE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The cropped JPEG (a data URL) as the file to upload. */
function blobOf(dataUrl: string) {
  const [head, body = ""] = dataUrl.split(",");
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: /data:([^;]+)/.exec(head ?? "")?.[1] ?? "image/jpeg" });
}

type Crop = { z: number; x: number; y: number };

/** The image's size in viewport units at zoom z: it always covers the square. */
const size = (i: HTMLImageElement, z: number) => { const a = i.width / i.height; return a >= 1 ? { w: z * a, h: z } : { w: z, h: z / a }; };

/**
 * Square crop: drag to move, the slider (or + / −) to zoom, arrow keys to nudge. Positions are in viewport units
 * (the square is 1 × 1), so the maths doesn't depend on its size on screen. Saves an 800px square JPEG.
 */
function PhotoCropper({ src, onCancel, onSave }: { src: string; onCancel: () => void; onSave: (url: string) => void }) {
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);
  const [c, setC] = React.useState<Crop>({ z: 1, x: 0, y: 0 });
  const box = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  React.useEffect(() => {
    let live = true;
    void loadImage(src).then((i) => {
      if (!live) return;
      setImg(i);
      const { w, h } = size(i, 1);
      setC({ z: 1, x: (1 - w) / 2, y: (1 - h) / 2 }); // centred to start
    });
    return () => { live = false; };
  }, [src]);
  const clamp = (i: HTMLImageElement, k: Crop): Crop => { const { w, h } = size(i, k.z); return { z: k.z, x: Math.min(0, Math.max(1 - w, k.x)), y: Math.min(0, Math.max(1 - h, k.y)) }; };
  const zoomTo = (z: number) => {
    if (!img) return;
    setC((k) => {
      const a = size(img, k.z), b = size(img, z);
      const cx = (0.5 - k.x) / a.w, cy = (0.5 - k.y) / a.h; // keep the centre where it is
      return clamp(img, { z, x: 0.5 - cx * b.w, y: 0.5 - cy * b.h });
    });
  };
  const save = () => {
    if (!img) return;
    const { w, h } = size(img, c.z);
    const canvas = document.createElement("canvas");
    canvas.width = MAX; canvas.height = MAX;
    canvas.getContext("2d")?.drawImage(img, (-c.x / w) * img.width, (-c.y / h) * img.height, img.width / w, img.height / h, 0, 0, MAX, MAX);
    onSave(canvas.toDataURL("image/jpeg", 0.86));
  };
  const s = img ? size(img, c.z) : { w: 1, h: 1 };
  return (
    <Modal open onClose={onCancel} title="Crop your photo" description="Drag to move it, zoom to frame your face. Clients see the square on your profile; search cards show the dashed band."
      footer={<><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button variant="primary" iconStart={<Check />} disabled={!img} onClick={save}>Use this photo</Button></>}>
      <div className="grid gap-4">
        <div ref={box} role="application" tabIndex={0} aria-label="Photo position. Drag, or use the arrow keys to move it."
          className="relative mx-auto aspect-square w-full max-w-80 cursor-grab touch-none overflow-hidden rounded-xl bg-surface-sunken outline-none select-none focus-visible:ring-2 focus-visible:ring-ink-brand active:cursor-grabbing"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, x: c.x, y: c.y }; }}
          onPointerMove={(e) => {
            const d = drag.current, v = box.current?.clientWidth;
            if (!d || !v || !img) return;
            setC((k) => clamp(img, { ...k, x: d.x + (e.clientX - d.px) / v, y: d.y + (e.clientY - d.py) / v }));
          }}
          onPointerUp={() => { drag.current = null; }}
          onKeyDown={(e) => {
            if (!img) return;
            const step = e.shiftKey ? 0.1 : 0.02, m: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
            if (m[e.key]) { e.preventDefault(); setC((k) => clamp(img, { ...k, x: k.x + m[e.key][0], y: k.y + m[e.key][1] })); }
            if (e.key === "+" || e.key === "=") zoomTo(Math.min(3, c.z + 0.1));
            if (e.key === "-") zoomTo(Math.max(1, c.z - 0.1));
          }}>
          {img && <img src={src} alt="" draggable={false} className="pointer-events-none absolute max-w-none"
            style={{ width: `${s.w * 100}%`, height: `${s.h * 100}%`, left: `${c.x * 100}%`, top: `${c.y * 100}%` }} />}
          {/* The 16:9 band a search card shows. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-y-2 border-dashed border-ink-on-brand/70" style={{ top: "21.875%", bottom: "21.875%" }} />
        </div>
        <Slider label="Zoom" min={1} max={3} step={0.01} value={c.z} onChange={zoomTo} format={(v) => `${Math.round(v * 100)}%`} />
      </div>
    </Modal>
  );
}

/**
 * Profile photo: pick, preview, replace or remove. The cropped photo goes through profiles.uploadPhoto: live, it is
 * stored on the profile at once and the field keeps its /media link; the sample keeps a small data URL.
 */
export function PhotoPicker({ value, name, onChange, error, id, personId: forPerson, confirm }: {
  value: string; name: string; onChange: (v: string) => void; error?: string; id: string;
  /** Whose profile the photo is for (else the signed-in person). */
  personId?: string;
  /** Runs `go` once a change is allowed (the live-edit warning on an approved profile), before anything is uploaded. */
  confirm?: (go: () => void) => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [problem, setProblem] = React.useState<string>();
  // The photo being cropped: a new upload, or the current photo to re-crop.
  const [cropping, setCropping] = React.useState<string | null>(null);
  const { session } = useSession();
  const use = (photo: string) => {
    setCropping(null);
    // The sample keeps the data URL. Live, the photo is uploaded to the person's profile and the field keeps its
    // /media link; a data URL would never be stored there.
    if (data.kind !== "live") { onChange(photo); return; }
    const personId = forPerson ?? session?.personId;
    if (!personId || !data.profiles.uploadPhoto) { setProblem("We couldn't upload that photo. Try again."); return; }
    void data.profiles.uploadPhoto(personId, blobOf(photo)).then(onChange, () => setProblem("We couldn't upload that photo. Try again."));
  };

  const pick = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setProblem("Choose an image file: JPG, PNG or HEIC."); return; }
    if (file.size > 15 * 1024 * 1024) { setProblem("That photo is over 15 MB. Choose a smaller one."); return; }
    const start = async () => { try { setProblem(undefined); setCropping(await readFile(file)); } catch { setProblem("We couldn't read that photo. Try another one."); } };
    if (confirm) confirm(() => void start()); else await start();
  };
  const message = problem ?? error;
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-line bg-surface-sunken p-4 xs:flex-row xs:items-center">
      {value
        ? <PersonPhoto id="self" name={name} src={value} alt="Your profile photo" className="size-20 shrink-0 rounded-xl shadow-md" />
        : <span className="grid size-20 shrink-0 place-items-center rounded-xl border border-dashed border-line-strong text-ink-subtle"><ImagePlus aria-hidden="true" /></span>}
      <div className="grid min-w-0 gap-2">
        <p id={`${id}-label`} className="text-label-md text-ink">Profile photo</p>
        <p className="text-body-sm text-ink-muted">A clear, friendly photo of you, face to camera. Clients see it first.</p>
        {message && <p id={`${id}-error`} className="text-body-sm text-danger">{message}</p>}
        <div className="flex flex-wrap gap-2">
          <input ref={input} id={id} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-labelledby={`${id}-label`}
            onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          <Button size="sm" variant="secondary" iconStart={<ImagePlus />} aria-describedby={message ? `${id}-error` : undefined} onClick={() => input.current?.click()}>
            {value ? "Replace photo" : "Upload a photo"}
          </Button>
          {value && <Button size="sm" variant="ghost" iconStart={<CropIcon />} onClick={() => (confirm ? confirm(() => setCropping(value)) : setCropping(value))}>Crop</Button>}
          {value && <Button size="sm" variant="ghost" iconStart={<Trash2 />} onClick={() => onChange("")}>Remove</Button>}
        </div>
      </div>
      {cropping && <PhotoCropper src={cropping} onCancel={() => setCropping(null)} onSave={use} />}
    </div>
  );
}
