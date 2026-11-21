/*
 * What the editor does around a save, kept apart from the component so it can be tested: taking the marketing answers
 * back from a save, submitting only after a save that worked, the words for a refusal, and the save sent as the page closes.
 */
import type { ProfileFields } from "@/lib/data/types";
import { SAMPLE_ERROR_CODES } from "./video-links";

/**
 * After a save, the editor takes the marketing answers the server reports: the stored choice becomes the baseline, so the
 * next change (untick after a tick) is seen as a change and sent. A checkbox the person changed while the save was in
 * flight keeps their value (only its baseline moves). A save that says nothing about the choice (preference unreadable) leaves it alone.
 */
export function adoptSavedMarketing(cur: ProfileFields, saved: ProfileFields, changedMeanwhile: boolean): ProfileFields {
  if (typeof saved.marketingEmailConsent !== "boolean") return cur;
  const next: ProfileFields = {
    ...cur,
    marketingEmailConsent: changedMeanwhile ? cur.marketingEmailConsent : saved.marketingEmailConsent,
    marketingConsentBaseline: saved.marketingConsentBaseline,
    marketingSuppressed: saved.marketingSuppressed,
    marketingNotice: saved.marketingNotice,
  };
  if (next.marketingSuppressed === undefined) delete next.marketingSuppressed;
  if (next.marketingNotice === undefined) delete next.marketingNotice;
  return next;
}

/** Sends the profile only after the save before it worked: a failed save keeps its error and nothing is submitted. */
export async function saveThenSubmit(flush: () => Promise<boolean>, submit: () => Promise<void>): Promise<"not-saved" | "sent"> {
  if (!(await flush())) return "not-saved";
  await submit();
  return "sent";
}

/** Plain words for the refusals the details, contact and rate answers can come back with. */
export const REFUSAL_COPY: Record<string, string> = {
  photo_caption_conflict: "This photo description changed elsewhere. Reload before editing it.",
  photo_caption_not_saved: "The photo description was not verified as saved. Reload before trying again.",
  invalid_photo_caption: "Use a description of at most 160 characters for a saved photo.",
  invalid_private_details: "Your contact choices couldn’t be saved. Check your phone number and how we may reach you, then try again.",
  invalid_travel_preference: "Your travel answer couldn’t be saved. Check it and try again.",
  invalid_insurance_notes: "Your insurance note couldn’t be saved. Shorten it or remove unusual characters, then try again.",
  contact_suppressed: "We can’t change email preferences for this address. Everything else you entered is saved.",
  invalid_public_details: "Your rates or LinkedIn link couldn’t be saved. Check them and try again.",
  invalid_linkedin_url: "That LinkedIn link isn’t valid. Use your full linkedin.com/in/… address.",
  invalid_phone: "That phone number isn’t valid. Use 7 to 20 digits; spaces, brackets and dashes are fine.",
  hourly_amount_required: "Add your hourly rate, or remove the hourly option.",
  rate_option_required: "Choose how you charge: hourly, by project, or both.",
};

type Refusal = { status?: unknown; code?: unknown; message?: unknown };

/** The words to show beside a failed save, or undefined for the generic "didn't save" (network, server, or an unknown code). */
export function saveErrorMessage(e: unknown, { samples }: { samples: boolean }): string | undefined {
  const r = (e && typeof e === "object" ? e : {}) as Refusal;
  const code = typeof r.code === "string" ? r.code : "";
  const message = typeof r.message === "string" && r.message && r.message !== code ? r.message : undefined;
  if (REFUSAL_COPY[code]) return REFUSAL_COPY[code];
  if (samples && SAMPLE_ERROR_CODES.has(code) && e instanceof Error) return e.message;
  // Another refusal about the person's own answers: Company OS's own sentence, never a bare code or a server fault.
  if (message && r.status === 422 && !SAMPLE_ERROR_CODES.has(code) && /^invalid_|_required$/.test(code)) return message;
  return undefined;
}

const UNSAVED_IMAGE = /data:image\/|data%3Aimage/;

/**
 * The fields for the save sent as the page closes (`keepalive` bodies are capped near 64 KB). An unsaved photo or video
 * thumbnail (a data URL) would blow that cap and lose the whole save, so the sample list is left out of this one: the
 * server leaves samples alone when the list is absent, and they save on the next normal save.
 */
export function urgentFields(fields: ProfileFields): ProfileFields {
  if (!fields.workSamples?.some((s) => UNSAVED_IMAGE.test(s))) return fields;
  const { workSamples: _unsaved, ...rest } = fields;
  void _unsaved;
  return rest as ProfileFields;
}

/** Coalesce callers, capture the next save only after its predecessor's receipt, and stop on failure. */
export function createDraftSaveQueue() {
  let inFlight: Promise<boolean> | null = null;
  return {
    busy: () => inFlight !== null,
    flush(hasPending: () => boolean, saveOnce: () => Promise<boolean>): Promise<boolean> {
      if (inFlight) return inFlight;
      inFlight = Promise.resolve().then(async () => {
        try {
          while (hasPending()) {
            if (!await saveOnce()) return false;
          }
          return true;
        } finally {
          inFlight = null;
        }
      });
      return inFlight;
    },
  };
}

/** A partial hidden-page save is not a complete editor save. Only the foreground drains omitted media. */
export function createDraftSaveVisibility() {
  let foreground = true;
  let deferredMedia = false;
  return {
    setForeground(visible: boolean) { foreground = visible; },
    canStart: () => foreground || !deferredMedia,
    hasDeferredMedia: () => deferredMedia,
    plan(fields: ProfileFields, localOnly = false) {
      // The fictional local sample does not send a keepalive body.
      const urgent = !foreground && !localOnly;
      const payload = urgent ? urgentFields(fields) : fields;
      return { fields: payload, urgent, deferredMedia: payload !== fields };
    },
    noteSuccess(omittedMedia: boolean) { deferredMedia = omittedMedia; },
    // Never auto-repeat a refused/ambiguous full write just because the tab becomes visible again.
    noteFailure() { deferredMedia = false; },
  };
}
