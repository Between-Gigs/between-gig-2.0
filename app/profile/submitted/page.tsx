import type { Metadata } from "next";
import { share } from "@/lib/og";
import { SubmittedPage } from "@/components/gigster/SubmittedPage";

export const metadata: Metadata = { ...share("profile-submitted"), title: "Profile submitted", robots: { index: false, follow: false } };

export default function Page() {
  return <SubmittedPage />;
}
