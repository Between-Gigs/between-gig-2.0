import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeProposals } from "@/components/proposals/HomeProposals";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("proposals"), title: "Home page proposals" };

export default function Page() {
  return <Suspense><HomeProposals /></Suspense>;
}
