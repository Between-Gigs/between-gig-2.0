import type { Metadata } from "next";
import { OwnerStaff } from "@/components/owners/OwnerStaff";

export const metadata: Metadata = { title: "Staff | Between Gigs" };

export default function Page() {
  return <OwnerStaff />;
}
