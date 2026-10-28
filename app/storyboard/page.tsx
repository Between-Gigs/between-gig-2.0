import type { Metadata } from "next";
import { Storyboard } from "@/components/funnel/Storyboard";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("storyboard"), title: "Interactive Storyboard", description: "See how entertainment-industry talent can solve everyday needs for people and businesses." };

export default function Page() {
  return <Storyboard />;
}
