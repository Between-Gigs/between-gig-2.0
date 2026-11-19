"use client";
import { Button, Field, Input } from "@ds/components";
import { Crop, Play, X } from "lucide-react";
import * as React from "react";
import { CAPTION_MAX, decodeSample, encodeVideoSample, parseVideoUrl, thumbnailFor, type VideoSample } from "@/lib/profile/video-links";
import { cropThumbnail } from "@/lib/profile/thumbnail-crop";
import type { Fit } from "@/lib/profile/work-fit";
import { FitCropper } from "./FitCropper";
import { useVimeoThumb } from "@/components/profile/WorkTile";

/** A work sample's thumbnail in the editor: what the profile will show, with the play badge. */
export function VideoSampleThumb({ video }: { video: VideoSample }) {
  const vimeo = useVimeoThumb(!video.thumb && video.video.provider === "vimeo" ? video.video.id : null);
  const thumb = thumbnailFor(video, vimeo);
  const [failed, setFailed] = React.useState<string | null>(null);
  return (
    <span className="absolute inset-0 block bg-surface-sunken">
      {thumb && failed !== thumb ? <img src={thumb} alt="" draggable={false} onError={() => setFailed(thumb)} className="absolute inset-0 size-full object-cover" /> : <span className="absolute inset-0 grid place-content-center px-4 pb-16 text-center text-body-sm text-ink-muted">Video thumbnail unavailable</span>}
      <span aria-hidden="true" className="absolute inset-0 grid place-content-center"><span className="grid size-12 place-content-center rounded-full bg-surface/90 text-ink shadow-md"><Play className="size-5 translate-x-px fill-current" /></span></span>
    </span>
  );
}

/**
 * Add or edit a video-link work sample: the link (YouTube or Vimeo, checked here the way the API checks it), an optional
 * caption and an optional thumbnail image. Without a thumbnail the provider's own image is shown.
 */
export function VideoLinkForm({ initial, onSave, onCancel, toImage }: {
  initial?: string; onSave: (sample: string) => void; onCancel: () => void; toImage: (file: File) => Promise<string>;
}) {
  const start = initial ? decodeSample(initial) : null;
  const was = start && start.kind === "video" ? start : null;
  const [url, setUrl] = React.useState(was?.video.url ?? "");
  const [caption, setCaption] = React.useState(was?.caption ?? "");
  const [thumb, setThumb] = React.useState(was?.thumb ?? "");
  const [error, setError] = React.useState("");
  const [thumbError, setThumbError] = React.useState("");
  const [fitting, setFitting] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const revision = React.useRef({ value: 0 });
  const parsed = parseVideoUrl(url);
  const preview: VideoSample | null = parsed.ok ? { kind: "video", video: parsed.video, thumb: thumb || undefined, caption } : null;
  const file = React.useRef<HTMLInputElement>(null);
  const field = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { field.current?.focus(); const epoch = revision.current; return () => { epoch.value++; }; }, []);
  const submit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (busy) return;
    const parsed = parseVideoUrl(url);
    if (!parsed.ok) { setError(parsed.error); field.current?.focus(); return; }
    onSave(encodeVideoSample({ url: parsed.video.url, thumb: thumb || undefined, caption: caption.trim() }));
  };
  const pickThumb = async (files: FileList | null) => {
    const f = [...(files ?? [])].find((x) => x.type.startsWith("image/"));
    if (!f) return;
    const version = ++revision.current.value; setBusy(true);
    try { setThumbError(""); const next = await toImage(f); if (version === revision.current.value) setThumb(next); }
    catch { if (version === revision.current.value) setThumbError("We couldn’t read that image. Try another one."); }
    finally { if (version === revision.current.value) setBusy(false); }
  };
  const saveCrop = async (fit: Fit) => {
    const version = ++revision.current.value; setBusy(true);
    try { const next = await cropThumbnail(thumb, fit); if (version === revision.current.value) { setThumb(next); setFitting(false); setThumbError(""); } }
    catch { if (version === revision.current.value) { setFitting(false); setThumbError("We couldn’t crop that image. Try another image."); } }
    finally { if (version === revision.current.value) setBusy(false); }
  };
  return (
    <>
    <form onSubmit={submit} noValidate aria-label={was ? "Edit video link" : "Add a video link"} className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:p-5">
      <Field label="YouTube or Vimeo link" error={error} hint={error ? undefined : "Paste the link from the video’s page. Videos play in your Showcase viewer where the provider permits it; they aren’t uploaded here."}>
        <Input id="f-video-url" ref={field} type="url" inputMode="url" autoComplete="off" value={url} placeholder="https://www.youtube.com/watch?v=…"
          onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }} />
      </Field>
      {preview && <figure className="grid gap-2"><div data-video-link-preview="" className="relative aspect-video overflow-hidden rounded-lg border border-line"><VideoSampleThumb video={preview} /></div><figcaption className="text-body-sm text-ink-muted">Video thumbnail preview</figcaption></figure>}
      <Field label="Caption" optional hint={`${caption.length} of ${CAPTION_MAX}`}>
        <Input id="f-video-caption" maxLength={CAPTION_MAX} value={caption} onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))} />
      </Field>
      <div className="grid gap-2">
        <p className="text-label-md text-ink">Video thumbnail<span className="ml-2 text-body-sm font-normal text-ink-subtle">Optional</span></p>
        <p className="text-body-sm text-ink-muted">The video’s own thumbnail appears automatically. You can set a custom thumbnail instead.</p>
        <input ref={file} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Upload a thumbnail image" onChange={(e) => { void pickThumb(e.target.files); e.target.value = ""; }} />
        <div className="flex flex-wrap items-center gap-3">
          {thumb && <img src={thumb} alt="Your thumbnail" className="h-14 w-auto rounded-md border border-line" />}
          <Button type="button" variant="secondary" size="sm" onClick={() => file.current?.click()}>{thumb ? "Replace custom thumbnail" : "Set a custom thumbnail"}</Button>
          {thumb && (thumb.startsWith("data:image/") || thumb.startsWith("/media/")) && <Button type="button" variant="secondary" size="sm" iconStart={<Crop />} disabled={busy} onClick={() => setFitting(true)}>Adjust custom thumbnail</Button>}
          {thumb && <Button type="button" variant="ghost" size="sm" iconStart={<X />} onClick={() => { revision.current.value++; setThumb(""); setThumbError(""); setBusy(false); }}>Remove thumbnail</Button>}
        </div>
        {busy && <p id="thumbnail-busy" role="status" className="text-body-sm text-ink-muted">Preparing your thumbnail…</p>}
        {thumbError && <p role="alert" className="text-body-sm text-danger">{thumbError}</p>}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy} aria-describedby={busy ? "thumbnail-busy" : undefined}>{was ? "Save video link" : "Add video link"}</Button>
      </div>
    </form>
    {fitting && <FitCropper sample={thumb} title="Adjust custom thumbnail" previewHint="This crop replaces your custom thumbnail image. The linked video stays unchanged." description="Drag the frame or zoom to crop your custom thumbnail. This replaces only the thumbnail image; your video stays unchanged." saving={busy} onCancel={() => { revision.current.value++; setFitting(false); setBusy(false); }} onSave={fit => { void saveCrop(fit); }} />}
    </>
  );
}
