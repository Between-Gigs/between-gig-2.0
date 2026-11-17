import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeVideoSample, decodeSample } from "@/lib/profile/video-links";
import { fromProfile } from "@/lib/data/companyos/fields";
import { completeFields } from "@/lib/data/contract/fixtures";
import { CompanyOsError, type Row } from "./companyos";
import { draftOps } from "./gigs";
import { cleanFields } from "./routes";
import { cleanSamples, planSamples, sampleRefusalMessage, saveSamples, samplesFrom } from "./work-samples";

// Work samples as Company OS records (flag on): a photo is a `portfolio` file, a video link a `profile_item` of kind
// `video_link` (value = link, detail = caption, thumbnail = id of a `video_thumbnail` file). One shared position order.
afterEach(() => vi.unstubAllEnvs());
const row = (id: string, data: Record<string, unknown>): Row => ({ id, data, createdAt: "", updatedAt: "" });
const file = (id: string, kind: string, position = 0) => row(id, { kind, owner_id: "prof", position, status: "ready" });
const link = (id: string, value: string, position: number, extra: Record<string, unknown> = {}) => row(id, { kind: "video_link", profile: "prof", value, position, ...extra });
const YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const YT2 = "https://www.youtube.com/watch?v=aaaaaaaaaaa";
const jpeg = (s: string) => `data:image/jpeg;base64,${Buffer.from(s).toString("base64")}`;
const clip = (url: string, extra: { caption?: string; thumb?: string } = {}) => encodeVideoSample({ url, ...extra });

describe("samplesFrom: the stored rows as the editor's list", () => {
  it("puts photos and links in one position order, photos as /media links, a thumbnail as the link's picture", () => {
    const out = samplesFrom([link("i1", YT, 1, { detail: "Showreel", thumbnail: "t1" })], [file("f2", "portfolio", 2), file("f0", "portfolio", 0), file("t1", "video_thumbnail")]);
    expect(out[0]).toBe("/media/f0");
    expect(out[2]).toBe("/media/f2");
    expect(decodeSample(out[1]!)).toMatchObject({ kind: "video", caption: "Showreel", thumb: "/media/t1", video: { id: "dQw4w9WgXcQ" } });
    expect(out).toHaveLength(3);
  });
  it("never lists a thumbnail file as a sample, and ignores a thumbnail id that isn't there", () => {
    expect(samplesFrom([], [file("t1", "video_thumbnail")])).toEqual([]);
    expect(decodeSample(samplesFrom([link("i1", YT, 0, { thumbnail: "gone" })], [])[0]!)).toMatchObject({ kind: "video", thumb: undefined });
  });
  it("skips a stored link that no longer passes the rules", () => {
    expect(samplesFrom([link("i1", "https://evil.com/youtube.com", 0)], [])).toEqual([]);
  });
});

describe("planSamples: what to change to make the stored rows match the editor's list", () => {
  const stored = { items: [link("i1", YT, 1, { detail: "Reel", thumbnail: "t1" })], files: [file("f0", "portfolio", 0), file("f2", "portfolio", 2), file("t1", "video_thumbnail")] };
  const same = ["/media/f0", clip(YT, { caption: "Reel", thumb: "/media/t1" }), "/media/f2"];

  it("nothing to do when nothing changed", () => {
    const p = planSamples(same, stored.items, stored.files);
    expect(p).toMatchObject({ itemDeletes: [], itemUpdates: [], itemCreates: [], removeFiles: [], positionPatches: [], photoUploads: [], thumbUploads: [] });
  });
  it("new photos (data URLs) are uploaded at their place, a new link is created without its thumbnail yet", () => {
    const p = planSamples([jpeg("a"), clip(YT, { caption: "Reel" }), clip(YT2, { caption: "", thumb: jpeg("t") })], [], []);
    expect(p.photoUploads).toEqual([{ dataUrl: jpeg("a"), position: 0 }]);
    expect(p.itemCreates).toEqual([{ op: "create", entity: "profile_item", data: { kind: "video_link", value: YT, detail: "Reel", position: 1 } }, { op: "create", entity: "profile_item", data: { kind: "video_link", value: YT2, position: 2 } }]);
    expect(p.thumbUploads).toEqual([{ create: 1, dataUrl: jpeg("t") }]);
  });
  it("a removed photo's file and a removed link's item and thumbnail go", () => {
    const p = planSamples(["/media/f2"], stored.items, stored.files);
    expect(p.removeFiles.sort()).toEqual(["f0", "t1"]);
    expect(p.itemDeletes).toEqual([{ op: "delete", entity: "profile_item", id: "i1" }]);
  });
  it("a new order moves the link's position and the photos' positions", () => {
    const p = planSamples([clip(YT, { caption: "Reel", thumb: "/media/t1" }), "/media/f2", "/media/f0"], stored.items, stored.files);
    expect(p.itemUpdates).toEqual([{ op: "update", entity: "profile_item", id: "i1", data: { position: 0 } }]);
    expect(p.positionPatches).toEqual([{ id: "f2", position: 1 }, { id: "f0", position: 2 }]);
  });
  it("a caption edit updates the item; replacing the thumbnail clears it first, deletes the old file, then uploads the new one", () => {
    const p = planSamples(["/media/f0", clip(YT, { caption: "New", thumb: jpeg("n") }), "/media/f2"], stored.items, stored.files);
    expect(p.itemUpdates).toEqual([{ op: "update", entity: "profile_item", id: "i1", data: { detail: "New", thumbnail: null } }]);
    expect(p.removeFiles).toEqual(["t1"]);
    expect(p.thumbUploads).toEqual([{ item: "i1", dataUrl: jpeg("n") }]);
  });
  it("removing only the thumbnail falls back to the provider's default", () => {
    const p = planSamples(["/media/f0", clip(YT, { caption: "Reel" }), "/media/f2"], stored.items, stored.files);
    expect(p.itemUpdates).toEqual([{ op: "update", entity: "profile_item", id: "i1", data: { thumbnail: null } }]);
    expect(p.removeFiles).toEqual(["t1"]);
  });
  it("never trusts a client list: a media link to a file that isn't this profile's, a javascript: entry and a tampered link are dropped", () => {
    const p = planSamples(["/media/someone-elses", "javascript:alert(1)", "video:" + encodeURIComponent(JSON.stringify({ u: "https://evil.com/youtube.com" })), "https://evil.com/x.jpg"], [], []);
    expect(p).toMatchObject({ photoUploads: [], itemCreates: [], thumbUploads: [] });
  });
  it("a thumbnail picture on a link may only be this profile's own file or a new upload", () => {
    const p = planSamples([clip(YT, { thumb: "/media/other" })], [], [file("t9", "video_thumbnail")]);
    expect(p.itemCreates[0]!.data).not.toHaveProperty("thumbnail");
    expect(p.thumbUploads).toEqual([]);
  });
});

describe("saveSamples: the calls, in an order the API's limits allow", () => {
  const calls: string[] = [];
  const cos = () => ({
    batch: vi.fn(async (_c: unknown, ops: { op: string; entity: string; id?: string; data?: Record<string, unknown> }[]) => { calls.push(`batch:${ops.map((o) => `${o.op}${o.data?.kind ? `:${o.data.kind}` : ""}`).join(",")}`); return { ids: ops.map((_, i) => `new${i}`) }; }),
    remove: vi.fn(async (_c: unknown, entity: string, id: string) => { calls.push(`remove:${entity}:${id}`); }),
    patch: vi.fn(async (_c: unknown, entity: string, id: string, data: Record<string, unknown>) => { calls.push(`patch:${entity}:${id}:${JSON.stringify(data)}`); return row(id, data); }),
    startUpload: vi.fn(async (_c: unknown, b: { kind: string; position?: number }) => { calls.push(`start:${b.kind}:${b.position ?? ""}`); return { file: row(`up-${calls.length}`, {}), uploadUrl: "https://upload.test/x" }; }),
    putBytes: vi.fn(async () => { calls.push("put"); }),
    confirmUpload: vi.fn(async (_c: unknown, id: string) => { calls.push(`confirm:${id}`); return { file: {} }; }),
  });
  it("deletes first (so the total stays under the limit), then creates, uploads photos, and last the thumbnails of links that now exist", async () => {
    calls.length = 0;
    const c = cos();
    await saveSamples({ cos: c as never, cred: { kind: "session", token: "t" } }, "prof",
      [jpeg("p"), clip(YT, { thumb: jpeg("t") })], [link("old", YT2, 0, { thumbnail: "ot" })], [file("ot", "video_thumbnail"), file("of", "portfolio", 1)]);
    expect(calls).toEqual([
      "batch:delete", "remove:file:ot", "remove:file:of",
      "batch:create:video_link", "start:portfolio:0", "put", expect.stringMatching(/^confirm:/),
      "start:video_thumbnail:", "put", expect.stringMatching(/^confirm:/), expect.stringMatching(/^patch:profile_item:new0:\{"thumbnail":"up-/),
    ]);
  });
  it("sends nothing when there is nothing to change", async () => {
    const c = cos();
    await saveSamples({ cos: c as never, cred: { kind: "session", token: "t" } }, "prof", ["/media/f0"], [], [file("f0", "portfolio", 0)]);
    expect(c.batch).not.toHaveBeenCalled(); expect(c.startUpload).not.toHaveBeenCalled(); expect(c.remove).not.toHaveBeenCalled();
  });
  it("turns the API's refusals into clear messages and keeps the code", async () => {
    const c = cos();
    c.batch.mockRejectedValueOnce(new CompanyOsError(422, "video_host_not_allowed"));
    await expect(saveSamples({ cos: c as never, cred: { kind: "session", token: "t" } }, "prof", [clip(YT)], [], [])).rejects.toMatchObject({ status: 422, code: "video_host_not_allowed", message: expect.stringMatching(/YouTube and Vimeo/) });
  });
  it("a refused photo upload says which limit it hit", async () => {
    const c = cos();
    c.startUpload.mockRejectedValueOnce(new CompanyOsError(422, "work_sample_limit"));
    await expect(saveSamples({ cos: c as never, cred: { kind: "session", token: "t" } }, "prof", [jpeg("p")], [], [])).rejects.toMatchObject({ code: "work_sample_limit", message: expect.stringMatching(/5 work samples/) });
  });
  it("a thumbnail the API refuses keeps the link and says so", async () => {
    const c = cos();
    c.startUpload.mockRejectedValueOnce(new CompanyOsError(422, "invalid_thumbnail"));
    await expect(saveSamples({ cos: c as never, cred: { kind: "session", token: "t" } }, "prof", [clip(YT, { thumb: jpeg("t") })], [], [])).rejects.toMatchObject({ code: "invalid_thumbnail", message: expect.stringMatching(/thumbnail/i) });
    expect(c.batch).toHaveBeenCalled();
  });
});

describe("sampleRefusalMessage", () => {
  it.each(["invalid_video_url", "video_host_not_allowed", "video_links_disabled", "work_sample_limit", "invalid_thumbnail", "file_type_not_allowed", "file_too_large"])("%s has a plain message", (code) => {
    expect(sampleRefusalMessage(code)).toMatch(/^[A-Z].{15,}\.$/);
  });
  it("is silent about codes that aren't about work samples", () => { expect(sampleRefusalMessage("forbidden")).toBeNull(); });
});

describe("cleanSamples (what the server accepts from the browser)", () => {
  it("keeps photos as data URLs or /media links and video entries, at most five, and drops anything else", () => {
    const good = [jpeg("a"), "/media/0b2f6c1e-0000-4000-8000-000000000000#fit=0.5,0.5,1,1.5", clip(YT)];
    expect(cleanSamples([...good, "javascript:alert(1)", "https://evil.com/x.jpg", "data:text/html;base64,AAAA", 5, null, "/media/../etc"])).toEqual(good);
    expect(cleanSamples(Array.from({ length: 9 }, () => jpeg("a")))).toHaveLength(5);
    expect(cleanSamples("nope")).toEqual([]);
  });
  it("refuses a picture over 6 MB", () => {
    expect(cleanSamples([`data:image/jpeg;base64,${"A".repeat(9_000_000)}`])).toEqual([]);
  });
});

describe("cleanFields and the flag", () => {
  const sent = { ...completeFields("Maya Ríos", "/media/f"), workSamples: [jpeg("a"), clip(YT)] };
  it("flag off: work samples never leave the browser (as before)", () => {
    expect(cleanFields(sent).workSamples).toBeUndefined();
  });
  it("flag on: they go to the server's checks", () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "1");
    expect(cleanFields(sent).workSamples).toEqual([jpeg("a"), clip(YT)]);
  });
});

describe("fromProfile with samples", () => {
  const base = completeFields("Maya Ríos", "/media/f");
  it("sets work samples only when the server read them", () => {
    expect(fromProfile({}, [], "").workSamples).toBeUndefined();
    expect(fromProfile({}, [], "", ["/media/f0"]).workSamples).toEqual(["/media/f0"]);
    expect(fromProfile({}, [], "", []).workSamples).toEqual([]);
    expect(base).toBeTruthy();
  });
});

describe("the item diff never touches video links", () => {
  it("a stored video_link is not deleted by an ordinary save, with the flag on or off", () => {
    const f = completeFields("Maya Ríos", "/media/f");
    const profile = row("prof", { person: "p-1", status: "approved", display_name: "Maya Ríos" });
    const ops = draftOps("p-1", f, { profile, items: [link("i1", YT, 0)] });
    expect(ops.some((o) => o.op === "delete" && o.id === "i1")).toBe(false);
  });
});
