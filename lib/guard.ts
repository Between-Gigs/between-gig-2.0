"use client";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import type { Role, Session } from "@/lib/data";
import { useSession } from "@/lib/session";

/**
 * Client-side gate for signed-in pages. Production also enforces this in the API (every DataSource call
 * is checked server-side); this only decides what to render. Returns null while deciding.
 */
export function useRequireRole(role: Role): Session | null {
  const { session, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const ok = !loading && !!session && session.role === role;
  React.useEffect(() => {
    if (!loading && !ok && role === "gigster") router.replace(`/login/?next=${encodeURIComponent(pathname)}`);
  }, [loading, ok, role, router, pathname]);
  return ok ? session : null;
}
