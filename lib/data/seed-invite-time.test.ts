import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSeed, DEMO_TOKENS } from "./seed";

const dayMs = 24 * 60 * 60 * 1000;

afterEach(() => vi.useRealTimers());

describe("fictional invitation seed lifetimes", () => {
  it.each(["2026-11-20T10:00:01.000Z", "2030-01-01T00:00:00.000Z"])(
    "seeds valid invitations for 30 days without refreshing expired or used examples at %s",
    (iso) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(iso));
      const { people, invites } = buildSeed();
      for (const token of [DEMO_TOKENS.valid, "quinn-harper-invite"]) {
        const invite = invites.find((row) => row.token === token)!;
        const person = people.find((row) => row.id === invite.personId)!;
        expect(invite.createdAt).toBe(iso);
        expect(person.invitedAt).toBe("2026-10-20T10:00:00.000Z");
        expect(Date.parse(invite.expiresAt) - Date.parse(invite.createdAt)).toBe(30 * dayMs);
        expect(invite.usedAt).toBeUndefined();
      }
      expect(Date.parse(invites.find((row) => row.token === DEMO_TOKENS.expired)!.expiresAt)).toBeLessThan(Date.now());
      expect(invites.find((row) => row.token === DEMO_TOKENS.used)?.usedAt).toBeTruthy();
    },
  );
});
