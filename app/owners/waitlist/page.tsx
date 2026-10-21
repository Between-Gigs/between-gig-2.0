import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerWaitlist } from "@/components/owners/OwnerWaitlist";

export const metadata: Metadata = { title: "Waitlist" };

export default function Page() {
  return <Suspense><OwnerWaitlist /></Suspense>;
}
