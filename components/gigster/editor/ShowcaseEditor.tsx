"use client";
import * as React from "react";
import { Button, Field, Input, RadioGroup, Textarea } from "@ds/components";
import { ArrowDown, ArrowUp, GripVertical, Crop, RefreshCw, Plus, Trash2 } from "lucide-react";
import { data } from "@/lib/data";
import { apiSource } from "@/lib/data/api";
import type { ShowcaseItem } from "@/lib/data/types";
import { safeMediaUrl } from "@/lib/profile/review";
import { legacyShowcase, mediaProblem, mp4Duration, SHOWCASE_MAX_BYTES, SHOWCASE_IMAGE_MAX_BYTES } from "@/lib/profile/showcase";
import { saveSampleMedia } from "@/lib/media/sample-store";
import { FitCropper } from "./FitCropper";
import { withFit, parseSample, type Fit } from "@/lib/profile/work-fit";
import { ShowcaseMedia, useShowcaseSource } from "@/components/profile/ShowcaseMedia";
import type { SectionProps } from "./ui";
export function ShowcaseEditor({ d, set }: SectionProps) {
    const items = legacyShowcase(d.showcase, d.workSamples), input = React.useRef<HTMLInputElement>(null), thumbnail = React.useRef<HTMLInputElement>(null);
    const replacing = React.useRef<number | null>(null), tiles = React.useRef<(HTMLLIElement | null)[]>([]);
    const [fitting, setFitting] = React.useState<string | null>(null), [dragging, setDragging] = React.useState<number | null>(null);
    const [busy, setBusy] = React.useState(false), [problem, setProblem] = React.useState(""), [link, setLink] = React.useState(""), [kind, setKind] = React.useState<"image" | "video">("video"), [thumbFor, setThumbFor] = React.useState<string | null>(null);
    const save = (next: ShowcaseItem[]) => set("showcase")(next);
    const upload = React.useCallback(async (file: File) => {
        if (file.type.startsWith("image/")) {
            if (file.size > SHOWCASE_IMAGE_MAX_BYTES)
                throw Error("Images must be 10 MB or smaller.");
            const original = URL.createObjectURL(file);
            try {
                const image = new Image();
                image.src = original;
                await image.decode();
                const k = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(image.naturalWidth * k);
                canvas.height = Math.round(image.naturalHeight * k);
                canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
                const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error("We couldn’t read that image.")), "image/jpeg", 0.86));
                file = new File([blob], "showcase.jpg", { type: "image/jpeg" });
            }
            finally {
                URL.revokeObjectURL(original);
            }
        }
        if (file.size > (file.type.startsWith("video/") ? SHOWCASE_MAX_BYTES : SHOWCASE_IMAGE_MAX_BYTES))
            throw Error(file.type.startsWith("video/") ? "Videos must be 50 MB or smaller." : "Images must be 10 MB or smaller.");
        const duration = file.type === "video/mp4" ? mp4Duration(new Uint8Array(await file.arrayBuffer())) : undefined;
        const issue = mediaProblem(file.type, file.size, duration);
        if (issue)
            throw Error(issue);
        if (data.kind !== "live")
            return saveSampleMedia(file);
        return apiSource.uploadWork(file);
    }, []);
    const migrating = React.useRef(false);
    React.useEffect(() => {
        if (data.kind !== "live" || migrating.current || d.showcase !== undefined || !d.workSamples?.length)
            return;
        migrating.current = true;
        void Promise.resolve().then(async () => {
            setBusy(true);
            try {
                const restored: ShowcaseItem[] = [];
                for (const [i, sample] of d.workSamples!.entries()) {
                    const source = parseSample(sample);
                    let url = source.src;
                    if (url.startsWith("data:image/")) {
                        const blob = await (await fetch(url)).blob();
                        url = await upload(new File([blob], "previous-showcase.jpg", { type: blob.type }));
                    }
                    if (!safeMediaUrl(url))
                        throw Error("An older image needs to be added again with Upload. Your original draft is still saved on this device.");
                    restored.push({ id: "imported-" + i, kind: "image", url: source.fit ? withFit(url, source.fit) : url, description: "" });
                }
                set("showcase")(restored);
            }
            catch (e) {
                setProblem(e instanceof Error ? e.message : "We couldn’t restore an older image.");
            }
            finally {
                setBusy(false);
            }
        });
    }, [d.showcase, d.workSamples, set, upload]);
    const pick = async (file: File | undefined, isThumbnail = false) => { if (!file)
        return; if (!isThumbnail && items.length >= 5)
        return; setBusy(true); setProblem(""); try {
        const url = await upload(file);
        if (isThumbnail) {
            save(items.map(i => i.id === thumbFor ? { ...i, thumbnail: url } : i));
        }
        else
            save([...items, { id: crypto.randomUUID(), kind: file.type.startsWith("video/") ? "video" : "image", url, description: "" }]);
    }
    catch (e) {
        setProblem(e instanceof Error ? e.message : "Upload failed.");
    }
    finally {
        setBusy(false);
    } };
    const pickFiles = async (files: FileList | null) => {
        const replace = replacing.current;
        replacing.current = null;
        const selected = [...(files ?? [])].slice(0, replace === null ? 5 - items.length : 1);
        if (!selected.length)
            return;
        setBusy(true);
        setProblem("");
        try {
            const added: ShowcaseItem[] = [];
            for (const file of selected) {
                const url = await upload(file);
                added.push({ id: crypto.randomUUID(), kind: file.type.startsWith("video/") ? "video" : "image", url, description: "" });
                save(replace === null ? [...items, ...added] : items.map((item, i) => i === replace ? { ...added[0], description: item.description } : item));
            }
        }
        catch (e) {
            setProblem(e instanceof Error ? e.message : "Upload failed.");
        }
        finally {
            setBusy(false);
        }
    };
    const drag = (e: React.PointerEvent) => { if (dragging === null)
        return; const to = tiles.current.findIndex(el => { if (!el)
        return false; const r = el.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }); if (to >= 0 && to !== dragging) {
        move(dragging, to);
        setDragging(to);
    } };
    const key = (e: React.KeyboardEvent, i: number) => { const to = ["ArrowLeft", "ArrowUp"].includes(e.key) ? i - 1 : ["ArrowRight", "ArrowDown"].includes(e.key) ? i + 1 : -1; if (to < 0 || to >= items.length)
        return; e.preventDefault(); move(i, to); requestAnimationFrame(() => document.getElementById("sample-grip-" + to)?.focus()); };
    const addLink = () => { const url = safeMediaUrl(link.trim()); if (!url || !url.startsWith("https:")) {
        setProblem("Use a public HTTPS image or video link.");
        return;
    } if (items.length >= 5)
        return; save([...items, { id: crypto.randomUUID(), kind, url, description: "" }]); setLink(""); setProblem(""); };
    const move = (at: number, to: number) => { if (to < 0 || to >= items.length)
        return; const next = [...items]; const [item] = next.splice(at, 1); next.splice(to, 0, item); save(next); };
    return <section id="sec-work" aria-labelledby="sec-work-h" className="grid scroll-mt-40 gap-5"><div className="grid gap-3"><h2 id="sec-work-h" className="font-display text-display-sm text-ink sm:text-display-md">Showcase your work <span className="font-sans text-body-sm text-ink-muted">· Optional · {items.length} of 5</span></h2><p className="max-w-prose text-body-md text-ink-muted">Show customers what you can do! Upload photos, videos, or examples of past projects that demonstrate your skills and experience. These can be from your work in film and television or projects you’ve completed outside the industry.</p><p className="text-body-sm text-ink-muted">Only share work you have permission to display.</p></div>
 <input ref={input} type="file" accept="image/*,video/mp4" multiple className="sr-only" tabIndex={-1} aria-label="Upload showcase image or video" onChange={e => { void pickFiles(e.target.files); e.target.value = ""; }}/>
 <input ref={thumbnail} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label="Choose video thumbnail" onChange={e => { void pick(e.target.files?.[0], true); e.target.value = ""; }}/>
 <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((item, i) => <li key={item.id} ref={el => { tiles.current[i] = el; }} className="grid content-start gap-3 rounded-lg border border-line bg-surface p-4"><figure><ShowcaseMedia item={item}/></figure><div className="flex flex-wrap gap-2"><button type="button" id={"sample-grip-" + i} aria-label={"Move work sample " + (i + 1) + " of " + items.length} title="Drag to reorder, or use the arrow keys" className="inline-flex min-h-11 touch-none items-center rounded-md px-2 text-ink hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(i); }} onPointerMove={drag} onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)} onKeyDown={e => key(e, i)}><GripVertical className="size-4" aria-hidden="true"/></button><span className="mr-auto self-center text-label-md text-ink">{i + 1} · {item.kind === "video" ? "Video" : "Image"}</span>{i > 0 && <Button variant="ghost" aria-label={"Move showcase item " + (i + 1) + " up"} iconStart={<ArrowUp />} onClick={() => move(i, i - 1)}/>} {i < items.length - 1 && <Button variant="ghost" aria-label={"Move showcase item " + (i + 1) + " down"} iconStart={<ArrowDown />} onClick={() => move(i, i + 1)}/>}<Button variant="ghost" aria-label={"Remove showcase item " + (i + 1)} iconStart={<Trash2 />} onClick={() => save(items.filter(x => x.id !== item.id))}/></div>{item.kind === "image" && <Button variant="secondary" iconStart={<Crop />} aria-label={"Adjust the fit of work sample " + (i + 1)} onClick={() => setFitting(item.id)}>Adjust</Button>}<Button variant="ghost" iconStart={<RefreshCw />} aria-label={"Replace showcase item " + (i + 1)} onClick={() => { replacing.current = i; input.current?.click(); }}>Replace</Button><Field label="Short description" optional><Textarea rows={2} maxLength={160} showCount value={item.description ?? ""} onChange={e => save(items.map(x => x.id === item.id ? { ...x, description: e.target.value } : x))}/></Field>{item.kind === "video" && <Button variant="secondary" onClick={() => { setThumbFor(item.id); thumbnail.current?.click(); }}>Choose video thumbnail</Button>}</li>)}</ol>
 {items.length < 5 && <div className="grid gap-5 rounded-lg border border-line bg-surface p-5"><div className="grid justify-items-start gap-2"><Button variant="secondary" iconStart={<Plus />} loading={busy} onClick={() => input.current?.click()}>Upload an image or video</Button><p className="text-body-sm text-ink-muted">JPG, PNG or WebP up to 10 MB. MP4 video up to 50 MB and two minutes.</p></div><div className="grid gap-3 border-t border-line pt-4"><RadioGroup name="showcase-link-type" label="Or add a link" orientation="horizontal" value={kind} onChange={v => setKind(v as typeof kind)} options={[{ value: "video", label: "Video" }, { value: "image", label: "Image" }]}/><div className="flex flex-wrap items-end gap-3"><Field label="Public image or video URL" className="min-w-0 flex-1"><Input type="url" value={link} maxLength={2048} placeholder="https://" onChange={e => setLink(e.target.value)}/></Field><Button variant="secondary" onClick={addLink}>Add link</Button></div><p className="text-body-sm text-ink-muted">YouTube and Vimeo links open on the video’s original site.</p></div></div>}
 {fitting && items.find(i => i.id === fitting) && <CropShowcase item={items.find(i => i.id === fitting)!} onCancel={() => setFitting(null)} onSave={fit => { save(items.map(item => item.id === fitting ? { ...item, url: withFit(item.url, fit) } : item)); setFitting(null); }}/>}
 {problem && <p role="alert" className="text-body-md text-danger">{problem}</p>}
 </section>;
}
function CropShowcase({ item, onCancel, onSave }: {
    item: ShowcaseItem;
    onCancel: () => void;
    onSave: (fit: Fit) => void;
}) { const sample = useShowcaseSource(item.url); return sample ? <FitCropper sample={sample} onCancel={onCancel} onSave={onSave}/> : null; }
