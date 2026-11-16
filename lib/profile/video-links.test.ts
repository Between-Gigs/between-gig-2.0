import { afterEach, describe, expect, it, vi } from "vitest";
import { CAPTION_MAX, MAX_SAMPLES, canAddSample, decodeSample, encodeVideoSample, parseVideoUrl, thumbnailFor, videoLinksEnabled, visibleSamples } from "./video-links";

// Work samples: five in all (photos and video links together), video links from YouTube and Vimeo only.
// The parser mirrors the API's allow-list (profiles 1.10.0: youtube.com, www.youtube.com, youtu.be, vimeo.com, player.vimeo.com).
afterEach(() => vi.unstubAllEnvs());
const ok = (u: string) => { const r = parseVideoUrl(u); if (!r.ok) throw new Error(`${u}: ${r.error}`); return r.video; };

describe("parseVideoUrl accepts the real forms", () => {
  it("YouTube watch, shorts, embed and youtu.be", () => {
    for (const u of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtube.com/watch?v=dQw4w9WgXcQ&t=10s", "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ?si=abc", "  https://youtu.be/dQw4w9WgXcQ  "]) {
      expect(ok(u)).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
    }
  });
  it("Vimeo numeric ids, the player form and an unlisted hash", () => {
    expect(ok("https://vimeo.com/76979871")).toEqual({ provider: "vimeo", id: "76979871", url: "https://vimeo.com/76979871" });
    expect(ok("https://player.vimeo.com/video/76979871?h=abc")).toMatchObject({ provider: "vimeo", id: "76979871" });
    expect(ok("https://vimeo.com/76979871/a1b2c3d4e5")).toMatchObject({ id: "76979871", url: "https://vimeo.com/76979871/a1b2c3d4e5" });
  });
});

describe("parseVideoUrl refuses hostile and wrong links, with a reason", () => {
  const refused = [
    "", "   ", "not a url", "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ", "https://evil.com/youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com@evil.com/watch?v=dQw4w9WgXcQ", "https://user:pw@www.youtube.com/watch?v=dQw4w9WgXcQ", "https://evil.com#@www.youtube.com/watch?v=dQw4w9WgXcQ",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ", "javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "//youtu.be/dQw4w9WgXcQ", "ftp://youtu.be/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ", "https://notyoutube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=short", "https://www.youtube.com/watch?v=dQw4w9WgXcQ<script>", "https://www.youtube.com/", "https://www.youtube.com/@channel", "https://www.youtube.com/playlist?list=PL123",
    "https://vimeo.com/", "https://vimeo.com/channels/staffpicks", "https://vimeo.com/abc", "https://player.vimeo.com/video/abc", "https://vimeo.com.evil.com/76979871",
    "https://example.com/video.mp4", "https://www.youtube.com/watch?v=dQw4w9WgXcQ" + "a".repeat(2100),
  ];
  it.each(refused)("refuses %s", (u) => {
    const r = parseVideoUrl(u);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(10);
  });
  it("names the problem in plain words", () => {
    expect(parseVideoUrl("")).toMatchObject({ ok: false, error: expect.stringMatching(/Paste a YouTube or Vimeo link/) });
    expect(parseVideoUrl("https://example.com/x")).toMatchObject({ ok: false, error: expect.stringMatching(/Only YouTube and Vimeo/) });
    expect(parseVideoUrl("http://youtu.be/dQw4w9WgXcQ")).toMatchObject({ ok: false, error: expect.stringMatching(/https:\/\//) });
  });
});

describe("samples: photos and video links together, five at most", () => {
  const photo = "data:image/jpeg;base64,AAAA";
  const video = encodeVideoSample({ url: "https://youtu.be/dQw4w9WgXcQ", caption: "Showreel" });
  it("round-trips a video sample and keeps photos as photos", () => {
    expect(decodeSample(photo)).toEqual({ kind: "image", src: photo });
    expect(decodeSample(`${photo}#fit=0.5,0.5,1,1.5`)).toEqual({ kind: "image", src: `${photo}#fit=0.5,0.5,1,1.5` });
    expect(decodeSample(video)).toEqual({ kind: "video", video: { provider: "youtube", id: "dQw4w9WgXcQ", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, thumb: undefined, caption: "Showreel" });
  });
  it("counts both kinds against the one limit of five", () => {
    expect(MAX_SAMPLES).toBe(5);
    expect(canAddSample([photo, video, photo, video])).toBe(true);
    expect(canAddSample([photo, video, photo, video, photo])).toBe(false);
  });
  it("clips the caption to 160 characters and never trusts a stored link", () => {
    expect(CAPTION_MAX).toBe(160);
    const long = decodeSample(encodeVideoSample({ url: "https://youtu.be/dQw4w9WgXcQ", caption: "x".repeat(400) }));
    expect(long && long.kind === "video" && long.caption.length).toBe(160);
    const tampered = "video:" + encodeURIComponent(JSON.stringify({ u: "https://evil.com/youtube.com", c: "hi" }));
    expect(decodeSample(tampered)).toBeNull();
    expect(decodeSample("video:%E0%A4%A")).toBeNull();
  });
});

describe("thumbnail order: uploaded, then the provider's default, then a neutral placeholder", () => {
  const sample = (url: string, thumb?: string) => { const s = decodeSample(encodeVideoSample({ url, thumb, caption: "" })); if (!s || s.kind !== "video") throw new Error("not a video"); return s; };
  it("uses the uploaded image first", () => {
    expect(thumbnailFor(sample("https://youtu.be/dQw4w9WgXcQ", "data:image/jpeg;base64,AAAA"))).toBe("data:image/jpeg;base64,AAAA");
  });
  it("YouTube falls back to its own image host", () => {
    expect(thumbnailFor(sample("https://youtu.be/dQw4w9WgXcQ"))).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });
  it("Vimeo uses the server-fetched thumbnail, only from Vimeo's image host, else null", () => {
    const v = sample("https://vimeo.com/76979871");
    expect(thumbnailFor(v, "https://i.vimeocdn.com/video/1-640.jpg")).toBe("https://i.vimeocdn.com/video/1-640.jpg");
    expect(thumbnailFor(v, "https://evil.com/x.jpg")).toBeNull();
    expect(thumbnailFor(v, "javascript:alert(1)")).toBeNull();
    expect(thumbnailFor(v)).toBeNull();
  });
  it("ignores an uploaded thumbnail that isn't an image", () => {
    expect(thumbnailFor(sample("https://youtu.be/dQw4w9WgXcQ", "javascript:alert(1)"))).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });
});

describe("the flag (NEXT_PUBLIC_PROFILE_VIDEO_LINKS), off by default", () => {
  const photo = "data:image/jpeg;base64,AAAA";
  const video = encodeVideoSample({ url: "https://youtu.be/dQw4w9WgXcQ", caption: "" });
  it("is on only for exactly 1", () => {
    expect(videoLinksEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "1"); expect(videoLinksEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "true"); expect(videoLinksEnabled()).toBe(false);
  });
  it("with the flag off, only photos are shown", () => {
    expect(visibleSamples([photo, video], false)).toEqual([photo]);
    expect(visibleSamples([photo, video], true)).toEqual([photo, video]);
  });
});
