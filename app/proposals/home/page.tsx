import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeProposals } from "@/components/proposals/HomeProposals";

export const metadata: Metadata = { title: "Home page proposals" };

export default function Page() {
  return <Suspense><HomeProposals /></Suspense>;
}
