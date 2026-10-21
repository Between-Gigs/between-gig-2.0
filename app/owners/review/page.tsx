import type { Metadata } from "next";
import { ReviewQueue } from "@/components/owners/ReviewQueue";

export const metadata: Metadata = { title: "Review queue" };

export default function Page() {
  return <ReviewQueue />;
}
