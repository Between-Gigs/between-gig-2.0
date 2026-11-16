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

export async function resolveLoginCallback(clerk: CallbackClerk, opts: { timedOut?: boolean } = {}): Promise<CallbackOutcome> {
  const signIn = clerk.client.signIn;
  const verification = signIn.firstFactorVerification;
  if (signIn.status === "complete" || verification?.status === "verified") return { kind: "idle" };
  if (verification?.status === "transferable") {
    try {
      const signUp = await clerk.client.signUp.create({ transfer: true });
      if (signUp.status === "complete" && signUp.createdSessionId) {
        await clerk.setActive({ session: signUp.createdSessionId });
        return { kind: "redirect", to: "/join/" }; // signed in but not registered: /join asks for the name and the terms
      }
      return { kind: "redirect", to: "/join/#/continue" }; // Clerk's sign-up carries on with what is missing
    } catch {
      return { kind: "error", message: CLOSED, retryHref: RETRY };
    }
  }
  if (verification?.status === "failed" || verification?.status === "expired" || verification?.error) return { kind: "error", message: GENERIC, retryHref: RETRY };
  if (opts.timedOut) return { kind: "error", message: GENERIC, retryHref: RETRY };
  return { kind: "idle" };
}
