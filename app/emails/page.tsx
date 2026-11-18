import type { Metadata } from "next";
import { SampleEmails } from "@/components/emails/SampleEmails";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("emails"), title: "Email previews" };

export default function Page() {
  return <SampleEmails />;
}
