import type { Metadata } from "next";
import { JourneyAccount } from "@/components/journey/JourneyAccount";

export const metadata: Metadata = {
  title: "Your Gigster account · Stage 2 journey",
  description: "Try the account step and edit a fictional Gigster profile.",
};

export default function JourneyAccountPage() {
  return <JourneyAccount />;
}
