import { describe, expect, it } from "vitest";
import type { Session } from "../data/types";
import { isLocalSampleSession } from "./sample-session";

describe("local sample identity during Clerk initialization", () => {
  const local: Session = { personId: "luis", email: "luis@example.com", name: "Luis", role: "gigster", startedAt: "2026-11-11" };
  it("honors a local registration or selected demo role only in the sample app", () => {
    expect(isLocalSampleSession("sample", local)).toBe(true);
    expect(isLocalSampleSession("sample", { ...local, via: "clerk" })).toBe(false);
    expect(isLocalSampleSession("sample", null)).toBe(false);
    expect(isLocalSampleSession("live", local)).toBe(false);
    expect(isLocalSampleSession("live", { ...local, via: "clerk" })).toBe(false);
  });
});
