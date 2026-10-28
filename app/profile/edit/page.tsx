import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileBuilder } from "@/components/builder/ProfileBuilder";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("profile-edit"), title: "Build your profile" };

export default function Page() {
  return <Suspense><ProfileBuilder /></Suspense>;
}
