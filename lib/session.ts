"use client";
import * as React from "react";
import { useAuthActions } from "@/lib/auth/context";
import { data, type Session } from "@/lib/data";

/** The signed-in session, kept in sync with sign in / out and demo role switches. */
export function useSession() {
  const auth = useAuthActions();
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const refresh = React.useCallback(async () => {
    setSession(await data.auth.session());
    setLoading(false);
  }, []);
  React.useEffect(() => {
    // Read once on mount (the store lives in the browser), then follow changes.
    void refresh(); // eslint-disable-line react-hooks/set-state-in-effect
    return data.auth.onChange(() => void refresh());
  }, [refresh]);
  return { session, loading: loading || auth.loading, refresh };
}
