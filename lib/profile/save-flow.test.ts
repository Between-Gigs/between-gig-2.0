import { describe, expect, it, vi } from "vitest";
import { blankFields } from "@/lib/data/fields";
import { DataError } from "@/lib/data/api";
import { marketingChange, privateDetails } from "./details";
import { adoptSavedMarketing, createDraftSaveQueue, REFUSAL_COPY, saveErrorMessage, saveThenSubmit, urgentFields } from "./save-flow";
import { encodeVideoSample } from "./video-links";
import { reconcilePhotoCaptionSave } from "./photo-captions";
import { serviceDraftReducer, type ServiceDraftState } from "./service-choice";

const base = blankFields();
const PNG = "data:image/png;base64,AAAA";

describe("adoptSavedMarketing (the editor takes the marketing answers from a save)", () => {
  it("tick, save, untick, save again: the second save carries the opt-out", () => {
    const ticked = { ...base, marketingEmailConsent: true, marketingConsentBaseline: false };
    // First save: the server now holds "on" and says so.
    const afterSave = adoptSavedMarketing(ticked, { ...base, marketingEmailConsent: true, marketingConsentBaseline: true }, false);
    expect(afterSave.marketingConsentBaseline).toBe(true);
    const unticked = { ...afterSave, marketingEmailConsent: false };
    const choice = marketingChange(unticked, true);
    expect(choice).toBe(false);
    expect(privateDetails(unticked, choice)).toMatchObject({ marketing_consent: false });
  });
  it("without taking the baseline, the same untick would send nothing (the bug)", () => {
    const ticked = { ...base, marketingEmailConsent: true, marketingConsentBaseline: false };
    expect(marketingChange({ ...ticked, marketingEmailConsent: false }, true)).toBeUndefined();
  });
  it("a checkbox changed while the save was in flight stays as the person left it, with the new baseline", () => {
    const cur = { ...base, marketingEmailConsent: false, marketingConsentBaseline: false };
    const next = adoptSavedMarketing(cur, { ...base, marketingEmailConsent: true, marketingConsentBaseline: true }, true);
    expect(next.marketingEmailConsent).toBe(false);
    expect(next.marketingConsentBaseline).toBe(true);
    expect(marketingChange(next, true)).toBe(false);
  });
  it("takes suppression and the retry notice, and clears them once gone", () => {
    const cur = { ...base, marketingEmailConsent: true, marketingConsentBaseline: false };
    const withNotice = adoptSavedMarketing(cur, { ...base, marketingEmailConsent: true, marketingConsentBaseline: false, marketingSuppressed: true, marketingNotice: "Try again." }, false);
    expect(withNotice).toMatchObject({ marketingSuppressed: true, marketingNotice: "Try again." });
    const cleared = adoptSavedMarketing(withNotice, { ...base, marketingEmailConsent: true, marketingConsentBaseline: true }, false);
    expect(cleared.marketingSuppressed).toBeUndefined();
    expect(cleared.marketingNotice).toBeUndefined();
  });
  it("leaves the editor alone when the save says nothing about the choice (preference unreadable)", () => {
    const cur = { ...base, marketingEmailConsent: true, marketingConsentBaseline: false };
    expect(adoptSavedMarketing(cur, { ...base }, false)).toEqual(cur);
  });
});

describe("saveThenSubmit", () => {
  it("does not submit when the save before it failed", async () => {
    const submit = vi.fn(async () => undefined);
    expect(await saveThenSubmit(async () => false, submit)).toBe("not-saved");
    expect(submit).not.toHaveBeenCalled();
  });
  it("submits once the save worked", async () => {
    const submit = vi.fn(async () => undefined);
    expect(await saveThenSubmit(async () => true, submit)).toBe("sent");
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it("lets a refusal from submit reach the caller", async () => {
    await expect(saveThenSubmit(async () => true, async () => { throw new DataError(422, "profile_incomplete"); })).rejects.toMatchObject({ code: "profile_incomplete" });
  });
});

describe("saveErrorMessage", () => {
  const codes = ["invalid_private_details", "invalid_travel_preference", "invalid_insurance_notes", "contact_suppressed", "invalid_public_details", "invalid_linkedin_url", "invalid_phone", "hourly_amount_required", "rate_option_required"];
  it.each(codes)("%s has its own plain copy", (code) => {
    const text = saveErrorMessage(new DataError(422, code), { samples: false });
    expect(text).toMatch(/^[A-Z].{15,}[.]$/);
    expect(text).not.toContain(code);
    expect(REFUSAL_COPY[code]).toBe(text);
  });
  it("falls back to the server's own words for another refusal about the answers", () => {
    expect(saveErrorMessage(new DataError(422, "invalid_something_new", "That value is too long."), { samples: false })).toBe("That value is too long.");
  });
  it("never shows a bare code, a 5xx or a non-refusal", () => {
    expect(saveErrorMessage(new DataError(422, "invalid_something_new"), { samples: false })).toBeUndefined();
    expect(saveErrorMessage(new DataError(502, "unavailable", "upstream says"), { samples: false })).toBeUndefined();
    expect(saveErrorMessage(new Error("network"), { samples: false })).toBeUndefined();
  });
  it("work-sample refusals use the server's message only with video links on", () => {
    const e = new DataError(422, "invalid_video_url", "That video link isn’t valid.");
    expect(saveErrorMessage(e, { samples: true })).toBe("That video link isn’t valid.");
    expect(saveErrorMessage(e, { samples: false })).toBeUndefined();
  });
});

describe("urgentFields (the save sent as the page closes, a keepalive body is capped near 64 KB)", () => {
  it("leaves the list alone when every sample is already stored", () => {
    const f = { ...base, workSamples: ["/media/abc", encodeVideoSample({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })] };
    expect(urgentFields(f)).toBe(f);
  });
  it("drops the sample list when an unsaved photo (data URL) is in it, so the rest still lands", () => {
    const f = { ...base, name: "Maya", workSamples: ["/media/abc", PNG] };
    const out = urgentFields(f);
    expect(out.name).toBe("Maya");
    expect("workSamples" in out).toBe(false);
  });
  it("drops it for an unsaved video thumbnail too", () => {
    const f = { ...base, workSamples: [encodeVideoSample({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumb: PNG })] };
    expect("workSamples" in urgentFields(f)).toBe(false);
  });
});

function deferred() {
  let release!: (ok: boolean) => void;
  const result = new Promise<boolean>(resolve => { release = resolve; });
  return { result, release };
}

describe("editor single-flight save drain", () => {
  it("does not capture a follow-up until the first receipt establishes its CAS baseline", async () => {
    const queue = createDraftSaveQueue();
    const a = deferred(), b = deferred();
    let current: ServiceDraftState = { fields: { ...base, photoCaptions: { a: "First typed" }, photoCaptionBaseline: { a: "Original" } }, conversion: null };
    let dirty = true;
    const captures: { caption: string; baseline: string }[] = [];
    let active = 0, peak = 0;
    const save = async () => {
      dirty = false;
      const snapshot = current.fields!;
      const captured = { caption: snapshot.photoCaptions!.a!, baseline: snapshot.photoCaptionBaseline!.a! };
      captures.push(captured);
      peak = Math.max(peak, ++active);
      const ok = await (captures.length === 1 ? a.result : b.result);
      if (ok) current = serviceDraftReducer(current, {
        type: "set", value: fields => fields && {
          ...fields, ...reconcilePhotoCaptionSave(fields, snapshot, snapshot, { a: captured.caption }, dirty),
        },
      });
      active--;
      return ok;
    };
    const first = queue.flush(() => dirty, save);
    await Promise.resolve();
    current = serviceDraftReducer(current, { type: "set", value: fields => fields && {...fields, photoCaptions: { a: "Second typed" } } });
    dirty = true;
    const second = queue.flush(() => dirty, save);
    expect(captures).toEqual([{ caption: "First typed", baseline: "Original" }]);
    a.release(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(captures[1]).toEqual({ caption: "Second typed", baseline: "First typed" });
    b.release(true);
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(peak).toBe(1);
    expect(current.fields?.photoCaptions?.a).toBe("Second typed");
    expect(current.fields?.photoCaptionBaseline?.a).toBe("Second typed");
  });

  it("a submit joins an active autosave and waits for a later edit to finish", async () => {
    const queue = createDraftSaveQueue();
    const a = deferred(), b = deferred();
    let dirty = true, attempt = 0;
    const save = async () => { dirty = false; return await (++attempt === 1 ? a.result : b.result); };
    void queue.flush(() => dirty, save);
    await Promise.resolve();
    const submit = vi.fn(async () => undefined);
    const sending = saveThenSubmit(() => queue.flush(() => dirty, save), submit);
    dirty = true;
    a.release(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(attempt).toBe(2);
    expect(submit).not.toHaveBeenCalled();
    b.release(true);
    expect(await sending).toBe("sent");
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("a refusal stops the shared drain and prevents submit, leaving pending edits for explicit retry", async () => {
    const queue = createDraftSaveQueue();
    const a = deferred();
    let dirty = true;
    const save = vi.fn(async () => { dirty = false; return await a.result; });
    void queue.flush(() => dirty, save);
    await Promise.resolve();
    const submit = vi.fn(async () => undefined);
    const sending = saveThenSubmit(() => queue.flush(() => dirty, save), submit);
    dirty = true;
    a.release(false);
    expect(await sending).toBe("not-saved");
    expect(dirty).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    expect(queue.busy()).toBe(false);
    expect(await queue.flush(() => dirty, async () => { dirty = false; return true; })).toBe(true);
  });
});
