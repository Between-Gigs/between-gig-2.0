import { describe, expect, it } from "vitest";
import {
  canStartAnotherManualRequest, isManualEmailName, manualReceiptStatus, manualRecipient,
  manualRetryMatches, nextReleaseAction, savedManualEmailRequest, savedManualEmailRequests, type ManualBinding, type Release,
} from "./email-manual";

const binding: ManualBinding = {
  templateKey: "profile_submitted", recipient: "riley@example.org", contextId: "821515aa-dc6d-4db4-b035-41df53497977",
  eventId: "238e5879-33c9-4e7e-b5ae-aab42ef6c496", releaseId: "fd450ff6-95ee-4618-abdd-fc101abcb62a", fingerprint: "b".repeat(64),
};
const requestId = "24a49e90-6c86-4a0f-86cc-825f74511d71";

describe("manual owner email", () => {
  it("limits manual replays to the three private notification templates", () => {
    for (const name of ["approved", "changes-requested", "profile-submitted"]) expect(isManualEmailName(name)).toBe(true);
    for (const name of ["invite", "sign-in-code", "welcome", "coming-soon", "diagnostic", "constructor"]) expect(isManualEmailName(name)).toBe(false);
  });

  it("accepts one normalized account address and rejects lists and header whitespace", () => {
    expect(manualRecipient(" Riley+owner@Example.ORG ")).toBe("riley+owner@example.org");
    for (const recipient of ["riley@example.org\n", "a@example.org, b@example.org", "a@example.org;b@example.org",
      "Riley <riley@example.org>", "riley@example.org\r\nBcc:someone@example.org"]) {
      expect(manualRecipient(recipient)).toBeNull();
    }
  });

  it("restores only a valid owner intent for the selected template", () => {
    const saved = { requestId, binding };
    expect(savedManualEmailRequest(saved, "profile-submitted")).toEqual(saved);
    expect(savedManualEmailRequest(saved, "changes-requested")).toBeNull();
    expect(savedManualEmailRequest({ ...saved, requestId: "new" }, "profile-submitted")).toBeNull();
    expect(savedManualEmailRequest({ ...saved, binding: { ...binding, recipient: "RILEY@example.org" } }, "profile-submitted")).toBeNull();
    expect(savedManualEmailRequest({ ...saved, binding: { ...binding, fingerprint: "not-a-sha256" } }, "profile-submitted")).toBeNull();
    expect(savedManualEmailRequest({ ...saved, binding: { ...binding, eventId: "not-a-uuid" } }, "profile-submitted")).toBeNull();
    expect(savedManualEmailRequest({ ...saved, binding: { ...binding, draftHtml: "private body" } }, "profile-submitted")).toBeNull();
  });

  it("restores independent account attempts and carries forward single-account storage", () => {
    const first = { requestId, binding };
    const second = {
      requestId: "a46370a9-f14d-43ba-8390-c3dbd039a9ee",
      binding: { ...binding, recipient: "casey@example.org" },
    };
    const state = { lastRecipient: second.binding.recipient, requests: [first, second] };
    expect(savedManualEmailRequests(first, "profile-submitted")).toEqual({ lastRecipient: binding.recipient, requests: [first] });
    expect(savedManualEmailRequests(state, "profile-submitted")).toEqual(state);
    expect(savedManualEmailRequests(state, "changes-requested")).toBeNull();
    expect(savedManualEmailRequests({ ...state, lastRecipient: "untracked@example.org" }, "profile-submitted")).toBeNull();
    expect(savedManualEmailRequests({ ...state, requests: [first, { ...second, requestId }] }, "profile-submitted")).toBeNull();
    expect(savedManualEmailRequests({ ...state, requests: [first, { ...second, binding }] }, "profile-submitted")).toBeNull();
  });

  it("allows a reviewed retry only for the exact saved binding", () => {
    expect(manualRetryMatches(binding, { ...binding })).toBe(true);
    for (const key of Object.keys(binding) as Array<keyof ManualBinding>) {
      expect(manualRetryMatches(binding, { ...binding, [key]: "different" })).toBe(false);
    }
  });

  it("requires explicit release steps in order and refuses stale snapshots", () => {
    const src = { id: "release-1", templateId: "template-1", sourceHash: "hash-1" } as Release;
    expect(nextReleaseAction("template-1", "hash-1", null)).toBe("draft");
    expect(nextReleaseAction("template-1", "hash-1", { ...src, status: "draft" })).toBe("approve");
    expect(nextReleaseAction("template-1", "hash-1", { ...src, status: "approved" })).toBe("publish");
    expect(nextReleaseAction("template-1", "hash-1", { ...src, status: "published" })).toBe("revoke");
    expect(nextReleaseAction("template-1", "hash-1", { ...src, sourceHash: "old-hash", status: "draft" })).toBe("draft");
    expect(nextReleaseAction("another-template", "hash-1", { ...src, status: "draft" })).toBeNull();
  });

  it("distinguishes queued, provider accepted and delivered, and blocks new intents after uncertain history", () => {
    expect(manualReceiptStatus("queued")).toBe("Queued for sending");
    expect(manualReceiptStatus("sent")).toBe("Accepted by the email provider");
    expect(manualReceiptStatus("delivered")).toBe("Delivery reported by the email provider");
    for (const state of [undefined, "scheduled", "queued", "sending", "history_unavailable", "unrecognized"]) {
      expect(canStartAnotherManualRequest(state)).toBe(false);
    }
    for (const state of ["sent", "delivered", "failed", "bounced", "cancelled"]) {
      expect(canStartAnotherManualRequest(state)).toBe(true);
    }
  });
});
