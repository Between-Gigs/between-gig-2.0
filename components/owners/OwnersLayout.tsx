"use client";
import { useSession } from "@/lib/session";
import { OwnerFrame } from "./OwnerShell";

/**
 * Keeps the owner frame (header and sidebar) mounted while moving between owner pages, so only the page
 * changes. Signed-out visitors and Gigsters get the pages' own "owners only" screen instead.
 */
export function OwnersLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  if (loading || session?.role === "owner") return <OwnerFrame>{children}</OwnerFrame>;
  return <>{children}</>;
}
