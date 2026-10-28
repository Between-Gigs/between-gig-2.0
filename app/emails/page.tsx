import type { Metadata } from "next";
import { EmailsIndex } from "@/components/emails/EmailsIndex";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("emails"), title: "Email previews" };

export default function Page() {
  return <EmailsIndex />;
}
