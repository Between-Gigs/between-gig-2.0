"use client";
import * as React from "react";
import { FittedImg } from "./FittedImg";
import { parseSample, withFit } from "@/lib/profile/work-fit";
import type { ShowcaseItem } from "@/lib/data/types";
import { readSampleMedia } from "@/lib/media/sample-store";
export function useShowcaseSource(url: string | undefined) { const base = url ? parseSample(url).src : "", fit = url ? parseSample(url).fit : null; const [resolved, setResolved] = React.useState({ url: "", source: "" }); React.useEffect(() => { if (!base.startsWith("sample-media:"))
    return; let active = true, object = ""; void readSampleMedia(base).then(blob => { object = URL.createObjectURL(blob); if (active)
    setResolved({ url: base, source: object });
else
    URL.revokeObjectURL(object); }).catch(() => undefined); return () => { active = false; if (object)
    URL.revokeObjectURL(object); }; }, [base]); const source = base.startsWith("sample-media:") ? (resolved.url === base ? resolved.source : "") : base; return source && fit ? withFit(source, fit) : source; }
export function ShowcaseMedia({ item }: {
    item: ShowcaseItem;
}) {
    const src = useShowcaseSource(item.url), poster = useShowcaseSource(item.thumbnail);
    const external = item.kind === "video" && !item.url.startsWith("sample-media:") && !item.url.startsWith("/media/") && !/\.(mp4|webm)(\?|$)/i.test(item.url);
    if (item.kind === "image")
        return src ? <div className="relative aspect-video overflow-hidden"><FittedImg sample={src} alt={item.description || "Showcase image"}/></div> : <div className="grid aspect-video place-content-center bg-surface-sunken text-body-sm text-ink-muted">Image unavailable</div>;
    if (external)
        return <a href={item.url} target="_blank" rel="noopener noreferrer" className="grid aspect-video place-content-center bg-surface-sunken text-center text-ink underline">{poster && <img src={poster} alt="Video thumbnail" className="aspect-video w-full object-cover"/>}<span className="p-3">Watch video ↗</span></a>;
    return <video controls preload="none" playsInline src={src || undefined} poster={poster || undefined} className="aspect-video w-full bg-surface-sunken" aria-label={item.description || "Showcase video"}/>;
}
export function ShowcaseGallery({ items }: {
    items: ShowcaseItem[];
}) { if (!items.length)
    return null; return <section aria-label="Showcase your work" className="mt-8 grid gap-5 border-t border-line-strong pt-8"><h2 className="font-display text-heading-lg text-ink">Showcase your work</h2><div className="grid gap-5 sm:grid-cols-2">{items.map(item => <figure key={item.id} className="overflow-hidden rounded-lg border border-line bg-surface"><ShowcaseMedia item={item}/>{item.description && <figcaption className="p-4 text-body-md text-ink">{item.description}</figcaption>}</figure>)}</div></section>; }
