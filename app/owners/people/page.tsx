import type { Metadata } from "next";
import { OwnerPeople } from "@/components/owners/OwnerPeople";

export const metadata: Metadata = { title: "People" };

export default function Page() {
  return <OwnerPeople />;
}
