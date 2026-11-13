"use client";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import type { Role, Session } from "@/lib/data";
import { useSession } from "@/lib/session";

/** Each role's home: where someone signed in with the other role is sent instead of a page that isn't theirs. */
const home: Record<Role, string> = { owner: "/owners/", gigster: "/profile/" };

/**
 * Client-side gate for signed-in pages. Production also enforces this in the API (every DataSource call
 * is checked server-side); this only decides what to render. Returns null while deciding.
 * Signed out: a Gigster page goes to /login/ and comes back after. Signed in with the other role (an owner opening
 * /profile/ or /profile/canvas/): straight to that role's own home, never to /login/, which would only say
 * "You're already signed in".
 */
export function useRequireRole(role: Role): Session | null {
  const { session, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const ok = !loading && !!session && (session.role === role || (role === "gigster" && session.role === "owner" && !!session.personId));
  const other = !loading && !!session && !ok ? session.role : null;
  React.useEffect(() => {
    if (loading || ok) return;
    if (other) router.replace(home[other]);
    else if (role === "gigster") router.replace(`/login/?next=${encodeURIComponent(pathname)}`);
  }, [loading, ok, other, role, router, pathname]);
  return ok ? session : null;
}
