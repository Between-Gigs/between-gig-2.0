import type { Metadata } from "next";
import { OwnerDashboard } from "@/components/owners/OwnerDashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return <OwnerDashboard />;
}
