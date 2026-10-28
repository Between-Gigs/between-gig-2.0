import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinView } from "@/components/auth/JoinView";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("join"), title: "Create your profile" };

export default function Page() {
  return <Suspense><JoinView /></Suspense>;
}
