import type { ShowcaseItem } from "@/lib/data/types";
export const SHOWCASE_MAX_BYTES = 50 * 1024 * 1024;
export const SHOWCASE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const SHOWCASE_MAX_SECONDS = 120;
/** Read the MP4 movie header, bounded by each parent box. Never trust a client-provided duration. */
export function mp4Duration(bytes: Uint8Array): number | null {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const type = (at: number) => String.fromCharCode(...bytes.slice(at, at + 4));
    const walk = (start: number, end: number, depth: number): number | null => {
        if (depth > 3)
            return null;
        for (let at = start; at + 8 <= end;) {
            let size = view.getUint32(at), header = 8;
            if (size === 1) {
                if (at + 16 > end)
                    return null;
                const big = view.getBigUint64(at + 8);
                if (big > BigInt(Number.MAX_SAFE_INTEGER))
                    return null;
                size = Number(big);
                header = 16;
            }
            else if (size === 0)
                size = end - at;
            if (size < header || at + size > end)
                return null;
            const body = at + header;
            if (type(at + 4) === "moov") {
                const duration = walk(body, at + size, depth + 1);
                if (duration !== null)
                    return duration;
            }
            if (type(at + 4) === "mvhd") {
                const version = bytes[body];
                if (version !== 0 && version !== 1)
                    return null;
                const off = body + (version === 1 ? 20 : 12);
                if (off + (version === 1 ? 12 : 8) > at + size)
                    return null;
                const scale = view.getUint32(off), ticks = version === 1 ? Number(view.getBigUint64(off + 4)) : view.getUint32(off + 4);
                return scale > 0 && ticks > 0 ? ticks / scale : null;
            }
            at += size;
        }
        return null;
    };
    return walk(0, bytes.byteLength, 0);
}
export function mediaProblem(mime: string, size: number, duration?: number | null): string | null {
    if (size <= 0)
        return "Choose a nonempty file.";
    if (["image/jpeg", "image/png", "image/webp"].includes(mime))
        return size <= SHOWCASE_IMAGE_MAX_BYTES ? null : "Images must be 10 MB or smaller.";
    if (mime !== "video/mp4")
        return "Choose a JPG, PNG, WebP image or MP4 video.";
    if (size > SHOWCASE_MAX_BYTES)
        return "Videos must be 50 MB or smaller.";
    if (duration == null || !Number.isFinite(duration) || duration <= 0)
        return "We couldn’t read the video’s duration. Try a standard MP4 file.";
    return duration <= SHOWCASE_MAX_SECONDS ? null : "Videos must be two minutes or shorter.";
}
export function legacyShowcase(items: ShowcaseItem[] | undefined, urls: string[] | undefined): ShowcaseItem[] { return items ?? (urls ?? []).map((url, i) => ({ id: "legacy-" + i, kind: "image" as const, url, description: "" })); }
