import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeVideoSample, SAMPLE_ERROR_CODES } from "@/lib/profile/video-links";
import { parseSample } from "@/lib/profile/work-fit";
import { CompanyOsError, type Row } from "./companyos";
import { saveDraft } from "./gigs";
import { completeFields } from "@/lib/data/contract/fixtures";
afterEach(() => vi.unstubAllEnvs());
import { cleanSamples, planSamples, samplesFrom, saveSamples } from "./work-samples";
const fit = "0.25,0.75,2,1.5";
const photo = (extra: Record<string, unknown> = {}): Row => ({ id: "f1", data: { kind: "portfolio", status: "ready", position: 0, ...extra }, createdAt: "", updatedAt: "" });
const jpeg = "data:image/jpeg;base64,YWJj";
const cred = { kind: "session", token: "test" } as const;
const mock = () => ({ batch: vi.fn(async () => ({ ids: [] })), remove: vi.fn(async () => undefined), patch: vi.fn(async (_cred: unknown, _entity: string, _id: string, _patch: Record<string, unknown>) => { void _cred; void _entity; return { ...photo(_patch), id: _id }; }), startUpload: vi.fn(async () => ({ file: { id: "new" }, uploadUrl: "upload" })), putBytes: vi.fn(), confirmUpload: vi.fn() });
describe("durable nondestructive portfolio fit", () => {
  it("round trips file metadata without changing the original media URL", () => {
    const sample = samplesFrom([], [photo({ image_fit: fit })])[0];
    expect(sample).toBe(`/media/f1#fit=${fit}`);
    expect(parseSample(sample).src).toBe("/media/f1");
    expect(planSamples([sample], [], [photo({ image_fit: fit })]).fitPatches).toEqual([]);
  });
  it("patches only this profile's photo, not video thumbnails or foreign ids", () => {
    const p = planSamples([`/media/f1#fit=${fit}`, `/media/foreign#fit=${fit}`], [], [photo()]);
    expect(p.fitPatches).toEqual([{ id: "f1", image_fit: fit }]);
    expect(p.removeFiles).toEqual([]);
  });
  it("saves existing-photo fit as metadata only and reads the same alignment back", async () => {
    const stored = photo(); const c = mock();
    c.patch.mockImplementation(async (_cred, _entity, _id, patch) => { Object.assign(stored.data, patch); return stored; });
    await saveSamples({ cos: c as never, cred }, "prof", [`/media/f1#fit=${fit}`], [], [stored]);
    expect(samplesFrom([], [stored])).toEqual([`/media/f1#fit=${fit}`]);
    expect(c.startUpload).not.toHaveBeenCalled();
    expect(c.putBytes).not.toHaveBeenCalled();
    expect(c.remove).not.toHaveBeenCalled();
  });
  it("absence preserves a prior fit for old clients", () => {
    expect(planSamples(["/media/f1"], [], [photo({ image_fit: fit })]).fitPatches).toEqual([]);
  });
  it("refuses a fitted replacement before removing the original, changing videos/order or uploading", async () => {
    const s = `${jpeg}#fit=${fit}`;
    expect(() => cleanSamples([s])).toThrow(/Save this photo first/);
    const c = mock();
    const clip = { id: "v1", data: { kind: "video_link", value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", position: 1 }, createdAt: "", updatedAt: "" };
    await expect(saveSamples({ cos: c as never, cred }, "prof", [s], [clip], [photo()]))
      .rejects.toMatchObject({ code: "invalid_image_fit" });
    for (const fn of Object.values(c)) expect(fn).not.toHaveBeenCalled();
  });
  it("rejects oversized fitted uploads before sanitizer size filtering can drop the original", () => {
    const oversized = `data:image/jpeg;base64,${"A".repeat(4_500_001)}`;
    expect(() => cleanSamples([`${oversized}#fit=${fit}`])).toThrow(/Save this photo first/);
    expect(cleanSamples([oversized])).toEqual([]); // unrelated legacy plain-image filtering unchanged
  });
  it("refuses forged fitted upload even before profile mutations in direct saveDraft", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "1");
    const c = { ...mock(), query: vi.fn(async () => []), all: vi.fn(async () => []) };
    await expect(saveDraft({ cos: c, cred, appUrl: "" } as never, "person", { ...completeFields("Maya", "/media/f1"), workSamples: [`${jpeg}#fit=${fit}`] }))
      .rejects.toMatchObject({ code: "invalid_image_fit" });
    for (const fn of Object.values(c)) expect(fn).not.toHaveBeenCalled();
  });
  it("uploads unaligned bytes first; a later saved-photo fit never reuploads or removes the original", async () => {
    const c = mock();
    await saveSamples({ cos: c as never, cred }, "prof", [jpeg], [], []);
    expect(c.putBytes).toHaveBeenCalledWith("upload", new Uint8Array([97,98,99]), "image/jpeg");
    expect(c.patch).not.toHaveBeenCalled();
    c.startUpload.mockClear(); c.putBytes.mockClear();
    const saved = { ...photo(), id: "new" };
    await saveSamples({ cos: c as never, cred }, "prof", [`/media/new#fit=${fit}`], [], [saved]);
    expect(c.patch).toHaveBeenCalledWith(cred, "file", "new", { image_fit: fit });
    expect(c.startUpload).not.toHaveBeenCalled(); expect(c.putBytes).not.toHaveBeenCalled(); expect(c.remove).not.toHaveBeenCalled();
  });
  it.each(["2,0.5,1,1", "0.5,0.5,5,1", "0.5,0.5,1,0", "0.12345,0.5,1,1", "NaN,0.5,1,1", "0.5,0.5,1,100000"])("rejects invalid incoming fit rather than silently removing the photo: %s", bad => {
    expect(() => cleanSamples([`/media/f1#fit=${bad}`])).toThrow();
    expect(() => planSamples([`/media/f1#fit=${bad}`], [], [photo()])).toThrow();
    expect(samplesFrom([], [photo({ image_fit: bad })])).toEqual(["/media/f1"]);
  });
  it("cleared or absent metadata renders the original, and default fit explicitly resets alignment", () => {
    expect(samplesFrom([], [photo({ image_fit: null })])).toEqual(["/media/f1"]);
    expect(planSamples(["/media/f1#fit=0.5,0.5,1,1.5"], [], [photo({ image_fit: fit })]).fitPatches)
      .toEqual([{ id: "f1", image_fit: "0.5,0.5,1,1.5" }]);
    expect(planSamples([`/media/f1#fit=${fit}`], [], [photo({ kind: "video_thumbnail" })]).fitPatches).toEqual([]);
  });
  it("keeps video links and ordering alongside aligned photos", () => {
    const clip = encodeVideoSample({ url: "https://youtu.be/dQw4w9WgXcQ", caption: "Reel" });
    const p = planSamples([clip, `/media/f1#fit=${fit}`], [], [photo()]);
    expect(p.itemCreates[0].data).toMatchObject({ kind: "video_link", detail: "Reel", position: 0 });
    expect(p.positionPatches).toEqual([{ id: "f1", position: 1 }]);
    expect(p.fitPatches).toEqual([{ id: "f1", image_fit: fit }]);
  });
  it.each(["invalid_image_fit", "photo_fit_requires_review", "image_fit_not_available"])("propagates %s, never claims saved", async code => {
    const c = mock(); c.patch.mockRejectedValue(new CompanyOsError(422, code));
    await expect(saveSamples({ cos: c as never, cred }, "prof", [`/media/f1#fit=${fit}`], [], [photo()])).rejects.toMatchObject({ code, message: expect.stringMatching(/photo|review/i) });
    expect(SAMPLE_ERROR_CODES.has(code)).toBe(true);
    expect(c.remove).not.toHaveBeenCalled();
  });
  it.each([undefined, "0.5,0.5,1,1.5"])("refuses missing/wrong PATCH readback before later sample mutations: %s", async image_fit => {
    const c = mock(); c.patch.mockResolvedValue(photo({ image_fit }));
    await expect(saveSamples({ cos: c as never, cred }, "prof", [`/media/f1#fit=${fit}`, jpeg], [], [photo(), { ...photo(), id: "removed" }]))
      .rejects.toMatchObject({ code: "image_fit_not_available" });
    expect(c.remove).not.toHaveBeenCalled(); expect(c.batch).not.toHaveBeenCalled(); expect(c.startUpload).not.toHaveBeenCalled();
  });
  it("accepts equivalent decimal readback", async () => {
    const c = mock(); c.patch.mockResolvedValue(photo({ image_fit: "0.2500,0.7500,2.0000,1.5000" }));
    await expect(saveSamples({ cos: c as never, cred }, "prof", [`/media/f1#fit=${fit}`], [], [photo()])).resolves.toBeUndefined();
  });

});
