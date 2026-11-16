import { describe, expect, it, vi } from "vitest";
import { resolveLoginCallback, type CallbackClerk } from "./sso-callback";

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
