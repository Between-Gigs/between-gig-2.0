import type { Metadata } from "next";
import { OwnerDashboard } from "@/components/owners/OwnerDashboard";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("owners"), title: "Dashboard" };

export default function Page() {
  return <OwnerDashboard />;
}
