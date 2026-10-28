import type { Metadata } from "next";
import { ProfessionalsLanding } from "@/components/funnel/ProfessionalsLanding";
import { share } from "@/lib/og";

export const metadata: Metadata = {
  ...share("professionals"),
  title: "For professionals",
  description: "Your skills don't stop when the cameras do. Get on the Los Angeles Call Sheet: free to join.",
};

export default function Page() {
  return <ProfessionalsLanding />;
}
