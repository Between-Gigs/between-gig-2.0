"use client";
import { Button } from "@ds/components";
import { ImagePlus, Trash2 } from "lucide-react";
import * as React from "react";
import { PersonPhoto } from "@/components/people/PersonPhoto";

const MAX = 480;

/** Reads an image file and returns a square-ish JPEG data URL no larger than 480px. The sample stores it in localStorage. */
async function resize(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("unreadable"));
      i.src = url;
    });
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Profile photo: pick, preview, replace or remove. Production uploads the file to storage (see the
 * handoff) and keeps the URL; the sample keeps a small data URL.
 */
export function PhotoPicker({ value, name, onChange, error, id }: { value: string; name: string; onChange: (v: string) => void; error?: string; id: string }) {
  const input = React.useRef<HTMLInputElement>(null);
  const [problem, setProblem] = React.useState<string>();
  const pick = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setProblem("Choose an image file: JPG, PNG or HEIC."); return; }
    if (file.size > 15 * 1024 * 1024) { setProblem("That photo is over 15 MB. Choose a smaller one."); return; }
    try { setProblem(undefined); onChange(await resize(file)); } catch { setProblem("We couldn't read that photo. Try another one."); }
  };
  const message = problem ?? error;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-surface-sunken p-4">
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
          {value && <Button size="sm" variant="ghost" iconStart={<Trash2 />} onClick={() => onChange("")}>Remove</Button>}
        </div>
      </div>
    </div>
  );
}
