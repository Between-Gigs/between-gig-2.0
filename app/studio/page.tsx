import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("studio"), title: "Studio", description: "A no-code editor and content manager for Between Gigs: collections, records and views." };

export default function Page() {
  return <Studio />;
}
