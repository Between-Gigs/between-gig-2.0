import type { Metadata } from "next";
import { SubmittedPage } from "@/components/gigster/SubmittedPage";

export const metadata: Metadata = { title: "Profile submitted", robots: { index: false, follow: false } };

export default function Page() {
  return <SubmittedPage />;
}
