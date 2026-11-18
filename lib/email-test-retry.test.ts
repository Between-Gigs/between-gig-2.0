import { describe, expect, it } from "vitest";
import { EMAIL_TEST_RETRY_MS, reusableEmailTest, savedEmailTest } from "./email-test-retry";
const now = 1800000000000;
const base = { recipient: "a@example.org", requestId: "11111111-1111-4111-8111-111111111111" };
describe("bounded email-test retries", () => {
  it("allows just within 23 hours and refuses the boundary, backend expiry and clock rollback", () => {
    expect(reusableEmailTest({ startedAt: now - EMAIL_TEST_RETRY_MS + 1 }, now)).toBe(true);
    for (const start of [now - EMAIL_TEST_RETRY_MS, now - 24 * 3600000, now + 1, NaN, Infinity, 0]) expect(reusableEmailTest({ startedAt: start }, now)).toBe(false);
    expect(reusableEmailTest({}, now)).toBe(false);
  });
  it("restores legacy intent as blocked, never upgrades it to a fresh timed attempt", () => {
    const restored = savedEmailTest(base)!;
    expect(restored).toEqual(base);
    expect(reusableEmailTest(restored, now)).toBe(false);
    expect(savedEmailTest({ ...base, recipient: "a@example.org,b@example.org" })).toBeNull();
  });
});
