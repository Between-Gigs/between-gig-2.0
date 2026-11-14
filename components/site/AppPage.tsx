"use client";
import { OwnerShell, useInOwnerFrame } from "@/components/owners/OwnerShell";
import { useSession } from "@/lib/session";
import { Page } from "./Page";

/** Pages both owners and visitors use (the email previews): owners see them inside the owner workspace. */
export function AppPage({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const inFrame = useInOwnerFrame();
  if (inFrame) return <>{children}</>;
  return session?.role === "owner" ? <OwnerShell>{children}</OwnerShell> : <Page>{children}</Page>;
}
