"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/site/Page";

/** Compatibility alias. The invitation itself has one canonical source and view at /emails/invite/. */
export function JourneyInvitation() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/emails/invite/${window.location.search}${window.location.hash}`);
  }, [router]);
  return <Page><div className="mx-auto grid max-w-xl gap-4 py-16 text-center">
    <h1 className="font-display text-heading-lg text-ink">Opening the invitation</h1>
    <Link href="/emails/invite/" className="min-h-11 text-body-md text-link underline underline-offset-4">Open invite email</Link>
  </div></Page>;
}
