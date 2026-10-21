import type { Metadata } from "next";
import { JournalIndex } from "@/components/journal/JournalIndex";
import { articles } from "@/lib/journal";

export const metadata: Metadata = { title: "The Journal", description: "Stories, production guides and industry perspectives from Between Gigs." };

export default function Page() {
  return <JournalIndex articles={articles} />;
}
