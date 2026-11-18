import { describe, expect, it, vi } from "vitest";
import { encodeVideoSample, SAMPLE_ERROR_CODES } from "@/lib/profile/video-links";
import { parseSample } from "@/lib/profile/work-fit";
import { CompanyOsError, type Row } from "./companyos";
import { cleanSamples, planSamples, samplesFrom, saveSamples } from "./work-samples";
const fit = "0.25,0.75,2,1.5";
const photo = (extra: Record<string, unknown> = {}): Row => ({ id: "f1", data: { kind: "portfolio", status: "ready", position: 0, ...extra }, createdAt: "", updatedAt: "" });
const jpeg = "data:image/jpeg;base64,YWJj";
const cred = { kind: "session", token: "test" } as const;
const mock = () => ({ batch: vi.fn(async () => ({ ids: [] })), remove: vi.fn(async () => undefined), patch: vi.fn(async (_cred: unknown, _entity: string, _id: string, _patch: Record<string, unknown>) => { void _cred; void _entity; void _id; void _patch; }), startUpload: vi.fn(async () => ({ file: { id: "new" }, uploadUrl: "upload" })), putBytes: vi.fn(), confirmUpload: vi.fn() });
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
    c.patch.mockImplementation(async (_cred, _entity, _id, patch) => { Object.assign(stored.data, patch); });
    await saveSamples({ cos: c as never, cred }, "prof", [`/media/f1#fit=${fit}`], [], [stored]);
    expect(samplesFrom([], [stored])).toEqual([`/media/f1#fit=${fit}`]);
    expect(c.startUpload).not.toHaveBeenCalled();
    expect(c.putBytes).not.toHaveBeenCalled();
    expect(c.remove).not.toHaveBeenCalled();
  });
  it("absence preserves a prior fit for old clients", () => {
    expect(planSamples(["/media/f1"], [], [photo({ image_fit: fit })]).fitPatches).toEqual([]);
  });
  it("accepts a new image with fit but uploads only the unchanged source bytes", async () => {
    const s = `${jpeg}#fit=${fit}`;
    expect(cleanSamples([s])).toEqual([s]);
    const c = mock();
    await saveSamples({ cos: c as never, cred }, "prof", [s], [], []);
    expect(c.putBytes).toHaveBeenCalledWith("upload", new Uint8Array([97,98,99]), "image/jpeg");
    expect(c.patch).toHaveBeenCalledWith(cred, "file", "new", { image_fit: fit });
    expect(c.confirmUpload.mock.invocationCallOrder[0]).toBeLessThan(c.patch.mock.invocationCallOrder[0]);
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
  it("removes only a newly uploaded photo if its metadata patch fails, so retry cannot duplicate it", async () => {
    const c = mock(); c.patch.mockRejectedValue(new CompanyOsError(422, "invalid_image_fit"));
    await expect(saveSamples({ cos: c as never, cred }, "prof", [`${jpeg}#fit=${fit}`], [], [])).rejects.toMatchObject({ code: "invalid_image_fit" });
    expect(c.remove).toHaveBeenCalledWith(cred, "file", "new");
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
});
