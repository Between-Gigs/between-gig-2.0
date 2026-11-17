import fs from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adoptStored, decodeSample, encodeVideoSample } from "@/lib/profile/video-links";
import { completeFields } from "@/lib/data/contract/fixtures";
import { SaveIndicator } from "@/components/builder/ProfileBuilder";
import { CompanyOsError, type Row } from "./companyos";
import { saveDraft } from "./gigs";
import { handle } from "./routes";
import { saveSamples, serialised } from "./work-samples";

// Review round 1 of PR 65 (M1, m3 to m7).
afterEach(() => vi.unstubAllEnvs());
const row = (id: string, data: Record<string, unknown>): Row => ({ id, data, createdAt: "", updatedAt: "" });
const jpeg = (s: string) => `data:image/jpeg;base64,${Buffer.from(s).toString("base64")}`;
const cred = { kind: "session", token: "t" } as const;

describe("M1: no photo alignment while Company OS can't keep it", () => {
  const editor = fs.readFileSync("components/gigster/editor/canvas.tsx", "utf8");
  const img = fs.readFileSync("components/profile/FittedImg.tsx", "utf8");
  it("hides Adjust under the flag and shows it when the flag is off, so a fit is never silently dropped", () => {
    expect(editor).toMatch(/\{!videos && !clip && <button[^>]*Adjust the fit/);
  });
  it("renders photos centred under the flag, whatever fragment an old string carries", () => {
    expect(img).toContain("videoLinksEnabled()");
    expect(img).toMatch(/const fit = .*videoLinksEnabled\(\)/);
  });
});

describe("m3: a failed upload leaves no pending file behind", () => {
  it("removes the pending file when the bytes can't be put, then rethrows", async () => {
    const remove = vi.fn(async () => undefined);
    const cos = { batch: vi.fn(), remove, patch: vi.fn(), startUpload: vi.fn(async () => ({ file: row("pend", {}), uploadUrl: "u" })),
      putBytes: vi.fn(async () => { throw new CompanyOsError(502, "storage_unavailable"); }), confirmUpload: vi.fn() };
    await expect(saveSamples({ cos: cos as never, cred }, "prof", [jpeg("a")], [], [])).rejects.toMatchObject({ code: "storage_unavailable" });
    expect(remove).toHaveBeenCalledWith(cred, "file", "pend");
    expect(cos.confirmUpload).not.toHaveBeenCalled();
  });
  it("also when confirming fails", async () => {
    const remove = vi.fn(async () => undefined);
    const cos = { batch: vi.fn(), remove, patch: vi.fn(), startUpload: vi.fn(async () => ({ file: row("pend", {}), uploadUrl: "u" })),
      putBytes: vi.fn(async () => undefined), confirmUpload: vi.fn(async () => { throw new CompanyOsError(422, "invalid_thumbnail"); }) };
    await expect(saveSamples({ cos: cos as never, cred }, "prof", [jpeg("a")], [], [])).rejects.toMatchObject({ code: "invalid_thumbnail" });
    expect(remove).toHaveBeenCalledWith(cred, "file", "pend");
  });
});

describe("m3: after edits during a save, photos already stored are not uploaded again", () => {
  const p = jpeg("a"), q = jpeg("b"), clip = encodeVideoSample({ url: "https://youtu.be/dQw4w9WgXcQ" });
  it("swaps each saved entry for its stored version and keeps the new ones", () => {
    const sent = [p, clip], stored = ["/media/f1", clip];
    expect(adoptStored(sent, stored, [p, clip, q])).toEqual(["/media/f1", clip, q]);
    expect(adoptStored(sent, stored, [clip, p])).toEqual([clip, "/media/f1"]);
  });
  it("leaves the list alone when the server's list isn't the same length (something was dropped)", () => {
    expect(adoptStored([p, q], ["/media/f1"], [p, q])).toEqual([p, q]);
  });
  it("uses each stored entry once", () => {
    expect(adoptStored([p, p], ["/media/f1", "/media/f2"], [p, p, p])).toEqual(["/media/f1", "/media/f2", p]);
  });
});

describe("m4: a failed sample step is shown, not 'saved'", () => {
  const ctx = (startUpload: () => Promise<never>) => {
    const profile = row("prof", { person: "p-1", status: "draft", display_name: "Maya" });
    return { cred, appUrl: "", cos: { query: async (_c: unknown, s: { entity: string }) => (s.entity === "profile" ? [profile] : []), all: async () => [], batch: async () => ({ ids: [] }),
      remove: async () => undefined, patch: async () => profile, startUpload, putBytes: async () => undefined, confirmUpload: async () => ({ file: {} }) } };
  };
  it("a storage failure while saving samples comes back as work_samples_not_saved with the plain message", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "1");
    await expect(saveDraft(ctx(async () => { throw new CompanyOsError(502, "storage_unavailable"); }) as never, "p-1", { ...completeFields("Maya", "/media/f"), workSamples: [jpeg("a")] }))
      .rejects.toMatchObject({ status: 422, code: "work_samples_not_saved", detail: "Your work samples weren't saved. Try again." });
  });
  it("a specific refusal keeps its own message", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "1");
    await expect(saveDraft(ctx(async () => { throw new CompanyOsError(422, "work_sample_limit"); }) as never, "p-1", { ...completeFields("Maya", "/media/f"), workSamples: [jpeg("a")] }))
      .rejects.toMatchObject({ code: "work_sample_limit" });
  });
  it("the save indicator says so", () => {
    const html = renderToStaticMarkup(React.createElement(SaveIndicator, { state: { status: "error", message: "Your work samples weren't saved. Try again." }, onRetry: () => undefined }));
    expect(html).toContain("Your work samples weren&#x27;t saved. Try again.");
    expect(renderToStaticMarkup(React.createElement(SaveIndicator, { state: { status: "error" }, onRetry: () => undefined }))).toContain("Not saved.");
  });
  it("the editor keeps the server's message for a sample failure", () => {
    expect(fs.readFileSync("components/gigster/editor/GigsterEditor.tsx", "utf8")).toMatch(/saveErrorMessage\(e, \{ samples: videoLinksEnabled\(\) \}\)[\s\S]*status: "error", message/);
  });
});

describe("m5: one save at a time per person", () => {
  it("serialised runs same-key jobs one after another, different keys together, and survives a failure", async () => {
    const log: string[] = [];
    const job = (name: string, ms: number, fail = false) => serialised("a", async () => { log.push(`${name}+`); await new Promise((r) => setTimeout(r, ms)); log.push(`${name}-`); if (fail) throw new Error("x"); });
    const [r1, r2, r3] = await Promise.allSettled([job("1", 20, true), job("2", 1), serialised("b", async () => { log.push("b+"); })]);
    expect(log.indexOf("1-")).toBeLessThan(log.indexOf("2+"));
    expect(log.indexOf("b+")).toBeLessThan(log.indexOf("1-"));
    expect([r1.status, r2.status, r3.status]).toEqual(["rejected", "fulfilled", "fulfilled"]);
  });
  it("two overlapping autosaves never reach Company OS together", async () => {
    let active = 0, peak = 0;
    const profile = row("prof", { person: "p-1", status: "draft", display_name: "Old" });
    const c = { cred, appUrl: "", cos: { query: async (_c: unknown, s: { entity: string }) => (s.entity === "profile" ? [profile] : []), all: async () => [],
      batch: async () => { active++; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, 10)); active--; return { ids: [] }; }, remove: async () => undefined } };
    const f = completeFields("Maya", "/media/f");
    await Promise.all([saveDraft(c as never, "p-1", f), saveDraft(c as never, "p-1", { ...f, about: "Changed." })]);
    expect(peak).toBe(1);
  });
});

describe("m6: the save route accepts five resized photos, and refuses more with a clear message", () => {
  const post = (body: string, length?: number) => new Request("http://localhost/api/profiles/saveDraft/", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer sess_clerk_cccccccccccccccc", ...(length ? { "content-length": String(length) } : {}) }, body });
  it("flag on: a 5 MB body gets past the size check", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "1");
    const res = await handle("profiles.saveDraft", post(JSON.stringify({ args: ["p", { workSamples: ["x".repeat(5_000_000)] }] })), { cos: { me: async () => { throw new CompanyOsError(401, "unauthorized"); } } as never });
    expect(res.status).not.toBe(413);
  });
  it("flag on: over the cap is a 413 with words, not a bare error", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "1");
    const res = await handle("profiles.saveDraft", post("{}", 40_000_000), { cos: {} as never });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ error: "too_large", message: expect.stringMatching(/work samples are too large/i) });
  });
  it("flag off: the old small limit stands", async () => {
    const res = await handle("profiles.saveDraft", post("{}", 2_000_000), { cos: {} as never });
    expect(res.status).toBe(413);
  });
});

describe("m7: a thumbnail link may only be one of the two providers' image hosts", () => {
  const thumbOf = (t: string) => { const s = decodeSample("video:" + encodeURIComponent(JSON.stringify({ u: "https://youtu.be/dQw4w9WgXcQ", t }))); return s && s.kind === "video" ? s.thumb : "bad"; };
  it("accepts ytimg and vimeocdn, refuses any other host", () => {
    expect(thumbOf("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg")).toBeDefined();
    expect(thumbOf("https://i.vimeocdn.com/video/1_640.jpg")).toBeDefined();
    for (const bad of ["https://evil.com/x.jpg", "https://i.ytimg.com.evil.com/x.jpg", "https://user@i.ytimg.com/x.jpg", "http://i.ytimg.com/x.jpg"]) expect(thumbOf(bad)).toBeUndefined();
  });
});
