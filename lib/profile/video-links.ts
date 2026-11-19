/**
 * Work samples that are video links (Between Gigs, Nov 2026). A Gigster has up to five work samples in any mix of photos
 * and links to a YouTube or Vimeo video, each link with an optional caption and an optional thumbnail they upload. There
 * are no video uploads. A visitor opens the supported provider in the shared Showcase lightbox, with an external fallback.
 *
 * The rules mirror the API (profiles module 1.10.0): https only, no userinfo or port, the host exactly one of
 * youtube.com, www.youtube.com, youtu.be, vimeo.com, player.vimeo.com, and a path that names one video. The whole feature
 * sits behind NEXT_PUBLIC_PROFILE_VIDEO_LINKS (off by default; the API must be 1.17.0 or later).
 *
 * A video sample rides in the same list as the photos (a work sample is one string, like the alignment fragment in
 * lib/profile/work-fit.ts): "video:" + the URI-encoded JSON {u: link, t?: thumbnail, c?: caption}. Anything read back is
 * parsed again, never trusted.
 */
export const MAX_SAMPLES = 5;
export const CAPTION_MAX = 160;
const URL_MAX = 2048;
const HOSTS = new Set(["youtube.com", "www.youtube.com", "youtu.be", "vimeo.com", "player.vimeo.com"]);
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const VIMEO_HASH = /^[A-Za-z0-9]{6,20}$/;

export const videoLinksEnabled = () => process.env.NEXT_PUBLIC_PROFILE_VIDEO_LINKS === "1";

export type VideoRef = { provider: "youtube" | "vimeo"; id: string; url: string };
export type VideoParse = { ok: true; video: VideoRef } | { ok: false; error: string };

const refuse = (error: string): VideoParse => ({ ok: false, error });
const NOT_ONE_VIDEO = "That doesn’t look like a link to a single YouTube or Vimeo video. Copy the link from the video’s page or its Share button.";

export function parseVideoUrl(input: string): VideoParse {
  const text = (input ?? "").trim();
  if (!text) return refuse("Paste a YouTube or Vimeo link.");
  if (text.length > URL_MAX) return refuse("That link is too long. Use the video’s own link.");
  let u: URL;
  try { u = new URL(text); } catch { return refuse("That doesn’t look like a link. Paste the full address, starting with https://"); }
  if (u.protocol !== "https:") return refuse("Use a link that starts with https://");
  if (u.username || u.password) return refuse("That link includes a username or password. Use the video’s plain link.");
  if (!HOSTS.has(u.hostname)) return refuse("Only YouTube and Vimeo links can be added.");
  if (u.port) return refuse(NOT_ONE_VIDEO);
  const parts = u.pathname.split("/").filter(Boolean);
  const youtube = (id: string | null | undefined): VideoParse => id && YT_ID.test(id) ? { ok: true, video: { provider: "youtube", id, url: `https://www.youtube.com/watch?v=${id}` } } : refuse(NOT_ONE_VIDEO);
  const vimeo = (id: string | undefined, hash?: string): VideoParse => id && VIMEO_ID.test(id) && (hash === undefined || VIMEO_HASH.test(hash))
    ? { ok: true, video: { provider: "vimeo", id, url: `https://vimeo.com/${id}${hash ? `/${hash}` : ""}` } } : refuse(NOT_ONE_VIDEO);
  if (u.hostname === "youtu.be") return parts.length === 1 ? youtube(parts[0]) : refuse(NOT_ONE_VIDEO);
  if (u.hostname === "vimeo.com") return parts.length === 1 || parts.length === 2 ? vimeo(parts[0], parts[1]) : refuse(NOT_ONE_VIDEO);
  if (u.hostname === "player.vimeo.com") return parts.length === 2 && parts[0] === "video" ? vimeo(parts[1], u.searchParams.get("h") ?? undefined) : refuse(NOT_ONE_VIDEO);
  // youtube.com, www.youtube.com
  if (parts.length === 1 && parts[0] === "watch") return youtube(u.searchParams.get("v"));
  if (parts.length === 2 && (parts[0] === "shorts" || parts[0] === "embed")) return youtube(parts[1]);
  return refuse(NOT_ONE_VIDEO);
}

export type VideoSample = { kind: "video"; video: VideoRef; thumb: string | undefined; caption: string };
export type ImageSample = { kind: "image"; src: string };
export type Sample = ImageSample | VideoSample;

const PREFIX = "video:";
const imageData = (v: unknown): v is string => typeof v === "string" && v.length < 4_000_000 && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
const httpsUrl = (v: unknown): v is string => typeof v === "string" && /^https:\/\/[^\s]+$/.test(v) && v.length <= URL_MAX;
/** A picture of this site's own media route (a file Company OS stored for the profile). */
export const mediaPath = (v: unknown): v is string => typeof v === "string" && /^\/media\/[A-Za-z0-9-]{1,64}$/.test(v);
/** A provider's own thumbnail host, and no other (the page's CSP allows exactly these two image hosts). */
const providerImage = (v: unknown): v is string => httpsUrl(v) && /^https:\/\/(?:i\.ytimg\.com|i\.vimeocdn\.com)\/[^\s@]+$/.test(v);
const THUMB_OK = (v: unknown): v is string => imageData(v) || providerImage(v) || mediaPath(v);

export function encodeVideoSample({ url, thumb, caption }: { url: string; thumb?: string; caption?: string }): string {
  return PREFIX + encodeURIComponent(JSON.stringify({ u: url, ...(thumb ? { t: thumb } : {}), ...(caption ? { c: caption.slice(0, CAPTION_MAX) } : {}) }));
}

/** One stored work sample as a photo or a video; null for a video entry that doesn't pass the rules (it is then never shown). */
export function decodeSample(sample: string): Sample | null {
  if (!sample.startsWith(PREFIX)) return { kind: "image", src: sample };
  try {
    const raw = JSON.parse(decodeURIComponent(sample.slice(PREFIX.length))) as { u?: unknown; t?: unknown; c?: unknown };
    const parsed = typeof raw.u === "string" ? parseVideoUrl(raw.u) : null;
    if (!parsed || !parsed.ok) return null;
    return { kind: "video", video: parsed.video, thumb: THUMB_OK(raw.t) ? raw.t : undefined, caption: typeof raw.c === "string" ? raw.c.slice(0, CAPTION_MAX) : "" };
  } catch { return null; }
}

/** Five in all, photos and links together. */
export const canAddSample = (list: readonly string[]) => list.filter(Boolean).length < MAX_SAMPLES;

/** What the editor and the profile show: with the flag off, photos only (nothing about video appears). */
export const visibleSamples = (list: readonly string[], enabled: boolean) => list.filter((s) => s && (enabled || !s.startsWith(PREFIX)));

/** Uploaded thumbnail, else the provider's own image (YouTube from its image host; Vimeo's fetched on the server), else null. */
export function thumbnailFor(s: VideoSample, vimeoThumb?: string | null): string | null {
  if (s.thumb) return s.thumb;
  if (s.video.provider === "youtube") return `https://i.ytimg.com/vi/${s.video.id}/hqdefault.jpg`;
  return typeof vimeoThumb === "string" && /^https:\/\/i\.vimeocdn\.com\/[^\s]+$/.test(vimeoThumb) ? vimeoThumb : null;
}

export type PortfolioItem = { src: string; caption: string; /** Position in the mixed-media lightbox. */ photoIndex: number; video?: VideoSample };

/** "3 photos", "2 samples" (once a video is among them). */
export const workMeta = (items: readonly PortfolioItem[]) => `${items.length} ${items.some((i) => i.video) ? (items.length === 1 ? "sample" : "samples") : "photos"}`;

export function portfolioItems(list: readonly string[], enabled: boolean): PortfolioItem[] {
  let samples = 0;
  return visibleSamples(list, enabled).flatMap((src, i) => {
    const s = decodeSample(src);
    if (!s) return [];
    if (s.kind === "video") return [{ src, caption: s.caption || "Video link", photoIndex: samples++, video: s }];
    return [{ src, caption: `Work sample ${i + 1}`, photoIndex: samples++ }];
  });
}

/**
 * After a save, the stored version of each sample the save carried (photos become /media links), laid over what is in the
 * editor now: an entry added or edited meanwhile stays as it is, and a photo already stored is never uploaded again.
 */
export function adoptStored(sent: readonly string[], stored: readonly string[], current: readonly string[]): string[] {
  if (sent.length !== stored.length) return [...current];
  const used = new Set<number>();
  return current.map((entry) => {
    const at = sent.findIndex((s, i) => s === entry && !used.has(i));
    if (at < 0) return entry;
    used.add(at);
    return stored[at]!;
  });
}

/** Refusal codes of the work-sample step (their messages come from the server). */
export const SAMPLE_ERROR_CODES = new Set(["work_samples_not_saved", "too_large", "invalid_video_url", "video_host_not_allowed", "video_links_disabled", "work_sample_limit", "invalid_thumbnail", "file_type_not_allowed", "file_too_large"]);
