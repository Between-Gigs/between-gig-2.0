import type { Metadata } from "next";
import { JourneyInvitation } from "@/components/journey/JourneyInvitation";

export const metadata: Metadata = {
  title: "Stage 2 invitation · Gigster journey",
  description: "A service-first invitation to join the founding Between Gigs community.",
};

export default function JourneyPage() {
  return <JourneyInvitation />;
}
