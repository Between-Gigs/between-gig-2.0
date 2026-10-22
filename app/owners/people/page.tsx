import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerPeople } from "@/components/owners/OwnerPeople";

export const metadata: Metadata = { title: "People" };

export default function Page() {
  return <Suspense><OwnerPeople /></Suspense>;
}
