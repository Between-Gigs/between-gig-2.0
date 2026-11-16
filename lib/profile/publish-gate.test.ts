import { afterEach, describe, expect, it, vi } from "vitest";
import { personStatuses } from "@/lib/data/types";
import { APPROVED_NOT_PUBLIC, APPROVED_NOT_PUBLIC_LINE, gigstersLabel, isApprovedPrivate, isPublicStatus, isReviewedStatus, ownerLabel, publishGateOn } from "./publish-gate";

afterEach(() => vi.unstubAllEnvs());

describe("the publish gate flag", () => {
  it("is off unless NEXT_PUBLIC_PROFILE_PUBLISH_GATE is exactly 1", () => {
    expect(publishGateOn()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_PROFILE_PUBLISH_GATE", "true");
    expect(publishGateOn()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_PROFILE_PUBLISH_GATE", "1");
    expect(publishGateOn()).toBe(true);
  });
});

describe("which statuses are public", () => {
  it("flag off: approved is public (today), published is too if it ever arrives", () => {
    expect(isPublicStatus("approved", false)).toBe(true);
    expect(isApprovedPrivate("approved", false)).toBe(false);
  });
  it("gate on: only published is public; approved is private", () => {
    expect(isPublicStatus("approved", true)).toBe(false);
    expect(isPublicStatus("published", true)).toBe(true);
    expect(isApprovedPrivate("approved", true)).toBe(true);
    expect(isApprovedPrivate("published", true)).toBe(false);
  });
  it("nothing before approval is public or reviewed", () => {
    for (const s of ["invited", "registered", "draft", "submitted", "changes_requested"] as const) {
      expect(isPublicStatus(s, true)).toBe(false);
      expect(isPublicStatus(s, false)).toBe(false);
      expect(isReviewedStatus(s)).toBe(false);
    }
    expect(isReviewedStatus("approved")).toBe(true);
    expect(isReviewedStatus("published")).toBe(true);
  });
  it("reads the flag from the environment when not told", () => {
    expect(isPublicStatus("approved")).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_PROFILE_PUBLISH_GATE", "1");
    expect(isPublicStatus("approved")).toBe(false);
  });
});

describe("labels per status", () => {
  it("every status has a badge", () => {
    for (const s of personStatuses) for (const gate of [false, true]) { expect(gigstersLabel(s, gate)).not.toBe(""); expect(ownerLabel(s, gate)).not.toBe(""); }
  });
  it("flag off keeps today's words", () => {
    expect(gigstersLabel("approved", false)).toBe("Approved");
    expect(ownerLabel("approved", false)).toBe("Approved");
  });
  it("gate on: the Gigster reads 'Approved, not yet public' until published, then 'Live'", () => {
    expect(APPROVED_NOT_PUBLIC).toBe("Approved, not yet public");
    expect(gigstersLabel("approved", true)).toBe(APPROVED_NOT_PUBLIC);
    expect(gigstersLabel("published", true)).toBe("Live");
    expect(APPROVED_NOT_PUBLIC_LINE).toBe("The Between Gigs team approved your profile. It goes public when we launch the directory.");
  });
  it("gate on: the owner reads 'Approved, not public' and 'Live'", () => {
    expect(ownerLabel("approved", true)).toBe("Approved, not public");
    expect(ownerLabel("published", true)).toBe("Live");
    expect(ownerLabel("submitted", true)).toBe("Submitted");
  });
});
