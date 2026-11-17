/**
 * Work samples as Company OS records (behind NEXT_PUBLIC_PROFILE_VIDEO_LINKS, API 1.17.0): a photo is a ready `portfolio`
 * file, a video link a `profile_item` of kind `video_link` (value = the link, detail = the caption, thumbnail = the id of
 * a `video_thumbnail` file of the same profile). Photos and links share one position order and Company OS counts them
 * together (`work_sample_limit`). The editor's list is one string per sample (lib/profile/video-links.ts); this turns it
 * into the calls that make the stored rows match it. Nothing in the list is trusted: ids must be this profile's own files.
 */
import { MAX_SAMPLES, decodeSample, encodeVideoSample, mediaPath, parseVideoUrl } from "@/lib/profile/video-links";
import { CompanyOsError, type BatchOp, type CompanyOs, type Credential, type Row } from "./companyos";

export const SAMPLE_KINDS = ["portfolio", "video_thumbnail"];
const MAX_CHARS = 4_500_000;
const DATA_IMAGE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MEDIA = /^\/media\/([A-Za-z0-9-]{1,64})(#fit=[\d.]+,[\d.]+,[\d.]+,[\d.]+)?$/;
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** What a browser may send as its work-sample list: photos (new as data URLs, stored as /media links) and video entries. */
export function cleanSamples(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is string => typeof s === "string" && s.length <= MAX_CHARS && (DATA_IMAGE.test(s) || MEDIA.test(s) || (s.startsWith("video:") && decodeSample(s) !== null))).slice(0, MAX_SAMPLES);
}

/** The stored rows (ready files and video_link items) as the editor's list, in position order. */
export function samplesFrom(items: Row[], files: Row[]): string[] {
  const thumbs = new Set(files.filter((f) => f.data.kind === "video_thumbnail").map((f) => f.id));
  const out: { at: number; tie: number; s: string }[] = [];
  for (const f of files) if (f.data.kind === "portfolio") out.push({ at: Number(f.data.position ?? 0), tie: 0, s: `/media/${f.id}` });
  for (const i of items) {
    if (i.data.kind !== "video_link") continue;
    const parsed = parseVideoUrl(str(i.data.value));
    if (!parsed.ok) continue;
    const t = str(i.data.thumbnail);
    out.push({ at: Number(i.data.position ?? 0), tie: 1, s: encodeVideoSample({ url: parsed.video.url, caption: str(i.data.detail), ...(thumbs.has(t) ? { thumb: `/media/${t}` } : {}) }) });
  }
  return out.sort((a, b) => a.at - b.at || a.tie - b.tie).map((x) => x.s);
}

export type SamplePlan = {
  itemDeletes: BatchOp[];
  itemUpdates: BatchOp[];
  itemCreates: BatchOp[];
  removeFiles: string[];
  positionPatches: { id: string; position: number }[];
  photoUploads: { dataUrl: string; position: number }[];
  /** `item` is a stored link; `create` the index in `itemCreates`. */
  thumbUploads: ({ item: string; dataUrl: string } | { create: number; dataUrl: string })[];
};

export function planSamples(want: readonly string[], items: Row[], files: Row[]): SamplePlan {
  const plan: SamplePlan = { itemDeletes: [], itemUpdates: [], itemCreates: [], removeFiles: [], positionPatches: [], photoUploads: [], thumbUploads: [] };
  const photos = new Map(files.filter((f) => f.data.kind === "portfolio").map((f) => [f.id, f]));
  const thumbFiles = new Set(files.filter((f) => f.data.kind === "video_thumbnail").map((f) => f.id));
  const pool = new Map<string, Row[]>();
  for (const i of items) if (i.data.kind === "video_link") pool.set(str(i.data.value), [...(pool.get(str(i.data.value)) ?? []), i]);
  const usedPhotos = new Set<string>(), keptThumbs = new Set<string>(), remove = new Set<string>();
  let position = 0;
  for (const s of want) {
    if (position >= MAX_SAMPLES + 20) break;
    const sample = decodeSample(s);
    if (!sample) continue;
    if (sample.kind === "image") {
      const media = MEDIA.exec(sample.src);
      if (media) {
        const f = photos.get(media[1]!);
        if (!f || usedPhotos.has(f.id)) continue;
        usedPhotos.add(f.id);
        if (Number(f.data.position ?? 0) !== position) plan.positionPatches.push({ id: f.id, position });
        position++;
      } else if (DATA_IMAGE.test(sample.src)) plan.photoUploads.push({ dataUrl: sample.src, position: position++ });
      continue;
    }
    const caption = sample.caption, thumb = sample.thumb ?? "";
    const have = pool.get(sample.video.url)?.shift();
    if (!have) {
      plan.itemCreates.push({ op: "create", entity: "profile_item", data: { kind: "video_link", value: sample.video.url, ...(caption ? { detail: caption } : {}), position } });
      if (DATA_IMAGE.test(thumb)) plan.thumbUploads.push({ create: plan.itemCreates.length - 1, dataUrl: thumb });
      position++;
      continue;
    }
    const patch: Record<string, unknown> = {};
    if (Number(have.data.position ?? 0) !== position) patch.position = position;
    if (str(have.data.detail) !== caption) patch.detail = caption;
    const current = str(have.data.thumbnail);
    const keep = mediaPath(thumb) && thumb === `/media/${current}` && thumbFiles.has(current);
    if (keep) keptThumbs.add(current);
    else {
      if (current) { patch.thumbnail = null; remove.add(current); }
      if (DATA_IMAGE.test(thumb)) plan.thumbUploads.push({ item: have.id, dataUrl: thumb });
    }
    if (Object.keys(patch).length) plan.itemUpdates.push({ op: "update", entity: "profile_item", id: have.id, data: patch });
    position++;
  }
  for (const left of pool.values()) for (const r of left) {
    plan.itemDeletes.push({ op: "delete", entity: "profile_item", id: r.id });
    if (str(r.data.thumbnail)) remove.add(str(r.data.thumbnail));
  }
  for (const id of photos.keys()) if (!usedPhotos.has(id)) remove.add(id);
  for (const id of thumbFiles) if (!keptThumbs.has(id)) remove.add(id);
  plan.removeFiles = [...remove];
  return plan;
}

const MESSAGES: Record<string, string> = {
  invalid_video_url: "That video link isn’t valid. Use the full YouTube or Vimeo address.",
  video_host_not_allowed: "Only YouTube and Vimeo video links can be added.",
  video_links_disabled: "Video links aren’t switched on yet. Add a photo for now.",
  work_sample_limit: `You can show up to ${MAX_SAMPLES} work samples, photos and video links together. Remove one to add another.`,
  invalid_thumbnail: "We couldn’t use that thumbnail. Choose a different image, or leave it out to use the video’s own thumbnail.",
  file_type_not_allowed: "Use a JPG, PNG or WebP image.",
  file_too_large: "That image is too large. Choose a smaller one.",
};
export const sampleRefusalMessage = (code: string): string | null => MESSAGES[code] ?? null;

const bytesOf = (dataUrl: string) => {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.*)$/.exec(dataUrl)!;
  return { mime: m[1]!, bytes: new Uint8Array(Buffer.from(m[2]!, "base64")) };
};

type Cos = Pick<CompanyOs, "batch" | "remove" | "patch" | "startUpload" | "putBytes" | "confirmUpload">;

/**
 * Makes the stored samples match `want`. Order matters to Company OS's limits: deletions first (so the total never
 * passes the limit), then the new links, then the photos, and last each thumbnail, which it only accepts once its link exists.
 */
export async function saveSamples({ cos, cred }: { cos: Cos; cred: Credential }, profileId: string, want: readonly string[], items: Row[], files: Row[]): Promise<void> {
  const plan = planSamples(want, items, files);
  const upload = async (dataUrl: string, kind: string, position?: number) => {
    const { mime, bytes } = bytesOf(dataUrl);
    const { file, uploadUrl } = await cos.startUpload(cred, { ownerEntity: "profile", ownerId: profileId, kind, filename: `${kind}.${mime.split("/")[1] === "jpeg" ? "jpg" : mime.split("/")[1]}`, mime, sizeBytes: bytes.byteLength, ...(position === undefined ? {} : { position }) });
    try {
      await cos.putBytes(uploadUrl, bytes, mime);
      await cos.confirmUpload(cred, file.id);
    } catch (e) {
      // No pending file is left counting against the profile's limits.
      await cos.remove(cred, "file", file.id).catch(() => undefined);
      throw e;
    }
    return file.id;
  };
  try {
    const first = [...plan.itemDeletes, ...plan.itemUpdates];
    if (first.length) await cos.batch(cred, first);
    for (const id of plan.removeFiles) await cos.remove(cred, "file", id);
    // A file's place is a nicety: if Company OS won't move it, the order it was uploaded in stands.
    for (const p of plan.positionPatches) await cos.patch(cred, "file", p.id, { position: p.position }).catch(() => undefined);
    const created = plan.itemCreates.length ? (await cos.batch(cred, plan.itemCreates.map((o) => ({ ...o, data: { ...o.data, profile: profileId } })))).ids : [];
    for (const p of plan.photoUploads) await upload(p.dataUrl, "portfolio", p.position);
    for (const t of plan.thumbUploads) {
      const item = "item" in t ? t.item : created[t.create]!;
      const id = await upload(t.dataUrl, "video_thumbnail");
      await cos.patch(cred, "profile_item", item, { thumbnail: id });
    }
  } catch (e) {
    const message = e instanceof CompanyOsError ? sampleRefusalMessage(e.code) : null;
    if (e instanceof CompanyOsError && message) throw new CompanyOsError(e.status, e.code, message);
    throw e;
  }
}

/** Runs jobs with the same key one after another (a failure doesn't stop the next); different keys don't wait for each other. */
const chains = new Map<string, Promise<unknown>>();
export function serialised<T>(key: string, job: () => Promise<T>): Promise<T> {
  const run = (chains.get(key) ?? Promise.resolve()).catch(() => undefined).then(job);
  const tail = run.catch(() => undefined);
  chains.set(key, tail);
  void tail.then(() => { if (chains.get(key) === tail) chains.delete(key); });
  return run;
}
