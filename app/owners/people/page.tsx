import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerPeople } from "@/components/owners/OwnerPeople";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("owners-people"), title: "People" };

export default function Page() {
  return <Suspense><OwnerPeople /></Suspense>;
}
