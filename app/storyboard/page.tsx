import type { Metadata } from "next";
import { Storyboard } from "@/components/funnel/Storyboard";

export const metadata: Metadata = { title: "Interactive Storyboard", description: "See how entertainment-industry talent can solve everyday needs for people and businesses." };

export default function Page() {
  return <Storyboard />;
}
