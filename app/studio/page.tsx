import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = { title: "Studio", description: "A no-code editor and content manager for Between Gigs: collections, records and views." };

export default function Page() {
  return <Studio />;
}
