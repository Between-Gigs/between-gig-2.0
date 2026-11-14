import type { Metadata } from "next";
import { JourneyInvitation } from "@/components/journey/JourneyInvitation";

export const metadata: Metadata = {
  title: "Opening the canonical invitation",
  description: "The Stage 2 invitation now lives in the Invite email preview.",
  robots: { index: false, follow: false },
};

export default function JourneyPage() {
  return <JourneyInvitation />;
}
