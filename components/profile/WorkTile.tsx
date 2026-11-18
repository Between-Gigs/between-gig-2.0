"use client";
import * as React from "react";
import { Play } from "lucide-react";
import { cx } from "@ds/components/cx";
import { FittedImg } from "@/components/profile/FittedImg";
import { asset } from "@/lib/site";
import { thumbnailFor, type PortfolioItem } from "@/lib/profile/video-links";

/** Vimeo's thumbnail comes from our server (never from the browser): null while it loads and when it isn't available. */
export function useVimeoThumb(id: string | null) {
  const [thumbnail, setThumbnail] = React.useState<{id:string;url:string} | null>(null);
  React.useEffect(() => {
    if (!id) return;
    let live = true;
    fetch(asset(`/api/video-thumb/?id=${encodeURIComponent(id)}`)).then((r) => (r.ok ? r.json() : null)).then((b: { url?: unknown } | null) => { if (live && b && typeof b.url === "string") setThumbnail({ id, url: b.url }); }).catch(() => undefined);
    return () => { live = false; };
  }, [id]);
  return thumbnail?.id === id ? thumbnail.url : null;
}

/**
 * One work sample in a profile's grid, inside its own positioned <li>. A photo opens the lightbox. A video link shows its
 * thumbnail (uploaded, else the provider's, else a neutral placeholder) with a play badge and links OUT to the video in a new
 * tab. It never embeds the video.
 */
export function WorkTile({ it, onPhoto, buttonClassName, imgClassName, children }: { it: PortfolioItem; onPhoto: (index: number) => void; buttonClassName: string; imgClassName?: string; children?: React.ReactNode }) {
  const video = it.video;
  const vimeo = useVimeoThumb(video && !video.thumb && video.video.provider === "vimeo" ? video.video.id : null);
  if (!video) {
    return (
      <button type="button" onClick={() => onPhoto(it.photoIndex)} aria-label={`Open image: ${it.caption}`} className={buttonClassName}>
        <FittedImg sample={it.src} loading="lazy" imgClassName={imgClassName} />{children}
      </button>
    );
  }
  const thumb = thumbnailFor(video, vimeo);
  return (
    <a href={video.video.url} target="_blank" rel="noopener noreferrer" aria-label={`Watch video: ${it.caption} (opens in a new tab)`} className={buttonClassName}>
      {thumb
        ? <FittedImg sample={thumb} loading="lazy" imgClassName={imgClassName} />
        : <span data-thumb-placeholder="" aria-hidden="true" className="absolute inset-0 block bg-surface-sunken" />}
      <span data-play-badge="" aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-content-center">
        <span className={cx("grid size-12 place-content-center rounded-full bg-surface/90 text-ink shadow-md")}><Play className="size-5 translate-x-px fill-current" /></span>
      </span>{children}
    </a>
  );
}
