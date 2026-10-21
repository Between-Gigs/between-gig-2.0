import type { Metadata } from "next";
import { ProfessionalsLanding } from "@/components/funnel/ProfessionalsLanding";

export const metadata: Metadata = {
  title: "For professionals",
  description: "Your skills don't stop when the cameras do. Get on the Los Angeles Call Sheet: free to join.",
};

export default function Page() {
  return <ProfessionalsLanding />;
}
