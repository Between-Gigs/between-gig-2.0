"use client";
import { Button, Field, Input } from "@ds/components";
import { Play, X } from "lucide-react";
import * as React from "react";
import { CAPTION_MAX, decodeSample, encodeVideoSample, parseVideoUrl, thumbnailFor, type VideoSample } from "@/lib/profile/video-links";
import { useVimeoThumb } from "@/components/profile/WorkTile";

/** A work sample's thumbnail in the editor: what the profile will show, with the play badge. */
export function VideoSampleThumb({ video }: { video: VideoSample }) {
  const vimeo = useVimeoThumb(!video.thumb && video.video.provider === "vimeo" ? video.video.id : null);
  const thumb = thumbnailFor(video, vimeo);
  return (
    <span className="absolute inset-0 block bg-surface-sunken">
      {thumb && <img src={thumb} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />}
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
  const file = React.useRef<HTMLInputElement>(null);
  const field = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { field.current?.focus(); }, []);
  const submit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const parsed = parseVideoUrl(url);
    if (!parsed.ok) { setError(parsed.error); field.current?.focus(); return; }
    onSave(encodeVideoSample({ url: parsed.video.url, thumb: thumb || undefined, caption: caption.trim() }));
  };
  const pickThumb = async (files: FileList | null) => {
    const f = [...(files ?? [])].find((x) => x.type.startsWith("image/"));
    if (!f) return;
    try { setThumbError(""); setThumb(await toImage(f)); } catch { setThumbError("We couldn’t read that image. Try another one."); }
  };
  return (
    <form onSubmit={submit} noValidate aria-label={was ? "Edit video link" : "Add a video link"} className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:p-5">
      <Field label="YouTube or Vimeo link" error={error} hint={error ? undefined : "Paste the link from the video’s page. Videos open on YouTube or Vimeo; they aren’t uploaded here."}>
        <Input id="f-video-url" ref={field} type="url" inputMode="url" autoComplete="off" value={url} placeholder="https://www.youtube.com/watch?v=…"
          onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }} />
      </Field>
      <Field label="Caption" optional hint={`${caption.length} of ${CAPTION_MAX}`}>
        <Input id="f-video-caption" maxLength={CAPTION_MAX} value={caption} onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))} />
      </Field>
      <div className="grid gap-2">
        <p className="text-label-md text-ink">Thumbnail<span className="ml-2 text-body-sm font-normal text-ink-subtle">Optional</span></p>
        <p className="text-body-sm text-ink-muted">Without one, we show the video’s own thumbnail.</p>
        <input ref={file} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Upload a thumbnail image" onChange={(e) => { void pickThumb(e.target.files); e.target.value = ""; }} />
        <div className="flex flex-wrap items-center gap-3">
          {thumb && <img src={thumb} alt="Your thumbnail" className="h-14 w-auto rounded-md border border-line" />}
          <Button type="button" variant="secondary" size="sm" onClick={() => file.current?.click()}>{thumb ? "Replace thumbnail" : "Upload a thumbnail"}</Button>
          {thumb && <Button type="button" variant="ghost" size="sm" iconStart={<X />} onClick={() => setThumb("")}>Remove thumbnail</Button>}
        </div>
        {thumbError && <p role="alert" className="text-body-sm text-danger">{thumbError}</p>}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">{was ? "Save video link" : "Add video link"}</Button>
      </div>
    </form>
  );
}
