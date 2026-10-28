import type { Metadata } from "next";
import { ReviewQueue } from "@/components/owners/ReviewQueue";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("owners-review"), title: "Review queue" };

export default function Page() {
  return <ReviewQueue />;
}
