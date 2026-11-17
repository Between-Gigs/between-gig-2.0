import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveLoginCallback, runLoginCallback, type CallbackClerk, type CallbackOutcome } from "./sso-callback";

// Clerk is mocked at its boundary: only the resources the resolver reads and the calls it makes.
function clerkWith(opts: {
  verification?: { status?: string; error?: { code?: string; message?: string } | null };
  signInStatus?: string;
  create?: ReturnType<typeof vi.fn>;
}) {
  const create = opts.create ?? vi.fn(async () => ({ status: "complete", createdSessionId: "sess_1" }));
  const setActive = vi.fn(async () => undefined);
  const clerk: CallbackClerk = {
    loaded: true,
    client: { signIn: { status: opts.signInStatus ?? "needs_identifier", firstFactorVerification: opts.verification ?? { status: "unverified", error: null } }, signUp: { create } },
    setActive,
  };
  return { clerk, create, setActive };
}

afterEach(() => { vi.useRealTimers(); });

const transferable = { status: "transferable", error: { code: "external_account_not_found", message: "not found" } };

describe("resolveLoginCallback", () => {
  it("transferable Google sign-in: transfers to a sign-up, activates the session and sends the person to finish on /join/", async () => {
    const { clerk, create, setActive } = clerkWith({ verification: transferable });
    const out = await resolveLoginCallback(clerk);
    expect(create).toHaveBeenCalledWith({ transfer: true });
    expect(setActive).toHaveBeenCalledWith({ session: "sess_1" });
    expect(out).toEqual({ kind: "redirect", to: "/join/" });
  });

  it("transfer that still needs details continues Clerk's sign-up on /join/", async () => {
    const create = vi.fn(async () => ({ status: "missing_requirements", createdSessionId: null }));
    const { clerk, setActive } = clerkWith({ verification: transferable, create });
    const out = await resolveLoginCallback(clerk);
    expect(setActive).not.toHaveBeenCalled();
    expect(out).toEqual({ kind: "redirect", to: "/join/#/continue" });
  });

  it("transfer not permitted: a clear message with the next step, not a spinner", async () => {
    const create = vi.fn(async () => { throw Object.assign(new Error("closed"), { errors: [{ code: "sign_up_restricted" }] }); });
    const { clerk } = clerkWith({ verification: transferable, create });
    const out = await resolveLoginCallback(clerk);
    expect(out.kind).toBe("error");
    if (out.kind === "error") {
      expect(out.message).toMatch(/isn't open|invitation|can't create/i);
      expect(out.retryHref).toBe("/login/");
    }
  });

  it("generic callback error: visible message and a retry link", async () => {
    const { clerk, create } = clerkWith({ verification: { status: "failed", error: { code: "oauth_access_denied", message: "denied" } } });
    const out = await resolveLoginCallback(clerk);
    expect(create).not.toHaveBeenCalled();
    expect(out).toMatchObject({ kind: "error", retryHref: "/login/" });
    if (out.kind === "error") expect(out.message.length).toBeGreaterThan(10);
  });

  it("a callback that never resolves ends in a visible message and retry", async () => {
    const { clerk } = clerkWith({});
    expect(await resolveLoginCallback(clerk, { timedOut: true })).toMatchObject({ kind: "error", retryHref: "/login/" });
  });

  it("normal successful Google sign-in is left alone", async () => {
    const { clerk, create } = clerkWith({ verification: { status: "verified", error: null }, signInStatus: "complete" });
    expect(await resolveLoginCallback(clerk)).toEqual({ kind: "idle" });
    expect(create).not.toHaveBeenCalled();
  });

  it("existing email sign-in (no callback, nothing failed) is left alone", async () => {
    const { clerk, create } = clerkWith({});
    expect(await resolveLoginCallback(clerk)).toEqual({ kind: "idle" });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("error-code split", () => {
  it("a network or unknown failure of the transfer shows the generic retry message, not the closed-sign-up one", async () => {
    const create = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    const { clerk } = clerkWith({ verification: transferable, create });
    const out = await resolveLoginCallback(clerk);
    expect(out.kind).toBe("error");
    if (out.kind === "error") expect(out.message).not.toMatch(/hello@between-gigs/);
  });
});

describe("runLoginCallback (the controller the login page runs)", () => {
  const collect = () => { const seen: CallbackOutcome[] = []; return { seen, onOutcome: (o: CallbackOutcome) => { seen.push(o); } }; };

  it("a double start (StrictMode) transfers once and both runs end the same way", async () => {
    vi.useFakeTimers();
    const { clerk, create } = clerkWith({ verification: transferable });
    const a = collect(), b = collect();
    const stopA = runLoginCallback(clerk, a);
    stopA(); // StrictMode cleanup, then the effect runs again
    const stopB = runLoginCallback(clerk, b);
    await vi.advanceTimersByTimeAsync(600);
    expect(create).toHaveBeenCalledTimes(1);
    expect(b.seen).toEqual([{ kind: "redirect", to: "/join/" }]);
    stopB();
    vi.useRealTimers();
  });

  it("picks up Clerk's state when it is populated after mount, without waiting for the cap", async () => {
    vi.useFakeTimers();
    const { clerk } = clerkWith({});
    const c = collect();
    const stop = runLoginCallback(clerk, c);
    await vi.advanceTimersByTimeAsync(1000);
    expect(c.seen).toEqual([]);
    clerk.client.signIn.firstFactorVerification = { status: "failed", error: { code: "oauth_access_denied" } };
    await vi.advanceTimersByTimeAsync(600);
    expect(c.seen).toHaveLength(1);
    expect(c.seen[0].kind).toBe("error");
    stop();
    vi.useRealTimers();
  });

  it("ends in an error at the 20 s cap, and stop() clears the timers", async () => {
    vi.useFakeTimers();
    const { clerk } = clerkWith({});
    const c = collect();
    runLoginCallback(clerk, c);
    await vi.advanceTimersByTimeAsync(21_000);
    expect(c.seen).toHaveLength(1);
    expect(c.seen[0].kind).toBe("error");
    const d = collect();
    const stop = runLoginCallback(clerk, d);
    stop();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});

describe("runLoginCallback: the page re-renders as soon as the session is active", () => {
  it("a brand-new Google user still reaches /join/ when the effect's cleanup runs before the transfer's answer is applied", async () => {
    vi.useFakeTimers();
    try {
      let stop: () => void = () => undefined;
      const create = vi.fn(async () => ({ status: "complete", createdSessionId: "sess_new" }));
      const clerk: CallbackClerk = {
        loaded: true,
        client: { signIn: { status: "needs_identifier", firstFactorVerification: transferable }, signUp: { create } },
        // setActive signs the user in, which re-renders the login view and runs the effect's cleanup
        setActive: vi.fn(async () => { stop(); }),
      };
      const seen: CallbackOutcome[] = [];
      stop = runLoginCallback(clerk, { onOutcome: (o) => seen.push(o) });
      await vi.advanceTimersByTimeAsync(100);
      expect(seen).toEqual([{ kind: "redirect", to: "/join/" }]);
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it("a stopped run does not show an error banner for a failed transfer after the page moved on", async () => {
    vi.useFakeTimers();
    try {
      let stop: () => void = () => undefined;
      const create = vi.fn(async () => { await Promise.resolve(); stop(); throw new Error("boom"); });
      const { clerk } = clerkWith({ verification: transferable, create });
      const seen: CallbackOutcome[] = [];
      stop = runLoginCallback(clerk, { onOutcome: (o) => seen.push(o) });
      await vi.advanceTimersByTimeAsync(100);
      expect(seen).toEqual([]);
    } finally { vi.useRealTimers(); }
  });
});
