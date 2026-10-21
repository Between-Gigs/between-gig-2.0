import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinView } from "@/components/auth/JoinView";

export const metadata: Metadata = { title: "Create your profile" };

export default function Page() {
  return <Suspense><JoinView /></Suspense>;
}
