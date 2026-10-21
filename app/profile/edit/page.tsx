import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileBuilder } from "@/components/builder/ProfileBuilder";

export const metadata: Metadata = { title: "Build your profile" };

export default function Page() {
  return <Suspense><ProfileBuilder /></Suspense>;
}
