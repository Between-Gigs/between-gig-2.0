"use client";
import { useClerk } from "@clerk/react";
import { Button } from "@ds/components";
import * as React from "react";
import { absoluteUrl, asset } from "@/lib/site";
import { useAuthV2 } from "./authDesign";

/** Hand off to the configured Google connection. A first-time Gigster confirms their name and accepts terms on return. */
export function GoogleSignup({ token }: { token?: string }) {
  const clerk = useClerk();
  const [requested, setRequested] = React.useState(false);
  const [error, setError] = React.useState("");
  const redirecting = React.useRef(false);
  const v2 = useAuthV2();
  React.useEffect(() => {
    if (!requested) return;
    const fail = (message: string) => {
      redirecting.current = false;
      setRequested(false);
      setError(message);
    };
    if (!clerk.loaded) {
      const timer = window.setTimeout(() => fail("Google sign-up couldn't load. Try again or continue with email below."), 10000);
      return () => window.clearTimeout(timer);
    }
    if (redirecting.current) return;
    redirecting.current = true;
    void clerk.client.signUp.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: absoluteUrl("/join/?method=google#/sso-callback"),
      redirectUrlComplete: absoluteUrl("/login/"),
      ...(token ? { unsafeMetadata: { inviteToken: token } } : {}),
    }).catch(() => fail("Couldn't open Google sign-up. Try again or continue with email below."));
  }, [requested, clerk, clerk.loaded, token]);

  // Browsers can restore this page from their back/forward cache after the Google chooser is canceled.
  React.useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) { redirecting.current = false; setRequested(false); }
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  return (
    <div className="mt-6 grid gap-3">
      <Button type="button" size="lg" fullWidth loading={requested}
        iconStart={<span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-white"><img src={asset("img/google-g.png")} width={18} height={18} alt="" className="size-4 object-contain" /></span>}
        onClick={() => { setError(""); setRequested(true); }}>Continue with Google</Button>
      {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
      <div className="flex items-center gap-3 text-body-sm text-ink-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-line" />{v2 ? "or" : "or continue with email"}<span aria-hidden="true" className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
