/**
 * The login page's OAuth return (`/login/#/sso-callback`). Clerk's sign-in marks a Google account it has never seen as
 * `transferable` (`external_account_not_found`) and, with transfer switched off in <SignIn>, stops there with a spinner.
 * We resolve it ourselves: transfer to a sign-up (open sign-up, as on /join) and let /join finish with the name and terms,
 * or end in a visible message with a way back. Pure over a small Clerk surface so it can be tested without a browser.
 */
export type CallbackClerk = {
  loaded: boolean;
  client: {
    signIn: { status?: string | null; firstFactorVerification?: { status?: string | null; error?: { code?: string; message?: string } | null } | null };
    signUp: { create: (params: { transfer: true }) => Promise<{ status?: string | null; createdSessionId?: string | null }> };
  };
  setActive: (params: { session: string }) => Promise<unknown>;
};

export type CallbackOutcome =
  | { kind: "idle" }
  | { kind: "redirect"; to: string }
  | { kind: "error"; message: string; retryHref: string };

const RETRY = "/login/";
const GENERIC = "We couldn't finish signing you in with Google. Try again, or log in with your email.";
const CLOSED = "We can't create an account from that Google sign-in right now. If you were invited, open the invitation email; otherwise write to hello@between-gigs.com.";

const RESTRICTED = new Set(["sign_up_restricted", "sign_up_mode_restricted", "sign_up_restricted_waitlist"]);
const errorCodes = (err: unknown): string[] => ((err as { errors?: { code?: string }[] } | null)?.errors ?? []).map((e) => e.code ?? "");
/** One transfer per Clerk client: a second concurrent or later call (StrictMode's double effect) shares the first's result. */
const transfers = new WeakMap<object, Promise<CallbackOutcome>>();

async function transfer(clerk: CallbackClerk): Promise<CallbackOutcome> {
  try {
    const signUp = await clerk.client.signUp.create({ transfer: true });
    if (signUp.status === "complete" && signUp.createdSessionId) {
      await clerk.setActive({ session: signUp.createdSessionId });
      return { kind: "redirect", to: "/join/" }; // signed in but not registered: /join asks for the name and the terms
    }
    return { kind: "redirect", to: "/join/#/continue" }; // Clerk's sign-up carries on with what is missing
  } catch (err) {
    return { kind: "error", message: errorCodes(err).some((c) => RESTRICTED.has(c)) ? CLOSED : GENERIC, retryHref: RETRY };
  }
}

export async function resolveLoginCallback(clerk: CallbackClerk, opts: { timedOut?: boolean } = {}): Promise<CallbackOutcome> {
  const signIn = clerk.client.signIn;
  const verification = signIn.firstFactorVerification;
  if (signIn.status === "complete" || verification?.status === "verified") return { kind: "idle" };
  if (verification?.status === "transferable") {
    const key = clerk.client as object;
    const existing = transfers.get(key);
    if (existing) return existing;
    const started = transfer(clerk);
    transfers.set(key, started);
    return started;
  }
  if (verification?.status === "failed" || verification?.status === "expired" || verification?.error) return { kind: "error", message: GENERIC, retryHref: RETRY };
  if (opts.timedOut) return { kind: "error", message: GENERIC, retryHref: RETRY };
  return { kind: "idle" };
}

const POLL_MS = 500;
const GIVE_UP_MS = 20_000;

/**
 * Runs the resolver until it has an answer: Clerk may populate the sign-in after mount, so check every 500 ms, and
 * give up with a message at 20 s. Returns stop(), which clears every timer (the effect's cleanup).
 */
export function runLoginCallback(clerk: CallbackClerk, h: { onOutcome: (o: CallbackOutcome) => void }): () => void {
  let done = false;
  const stop = () => { done = true; clearInterval(poll); clearTimeout(cap); };
  const check = async (timedOut: boolean) => {
    const out = await resolveLoginCallback(clerk, { timedOut });
    if (done || out.kind === "idle") return;
    stop();
    h.onOutcome(out);
  };
  void check(false);
  const poll = setInterval(() => void check(false), POLL_MS);
  const cap = setTimeout(() => void check(true), GIVE_UP_MS);
  return stop;
}
