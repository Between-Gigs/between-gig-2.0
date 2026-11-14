import type { Metadata } from "next";
import { share } from "@/lib/og";
import { OwnerStaff } from "@/components/owners/OwnerStaff";

export const metadata: Metadata = { ...share("owners-staff"), title: "Staff" };

export default function Page() {
  return <OwnerStaff />;
}
