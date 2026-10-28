import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerWaitlist } from "@/components/owners/OwnerWaitlist";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("owners-waitlist"), title: "Waitlist" };

export default function Page() {
  return <Suspense><OwnerWaitlist /></Suspense>;
}
