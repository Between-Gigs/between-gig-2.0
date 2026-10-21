import type { Metadata } from "next";
import { EmailsIndex } from "@/components/emails/EmailsIndex";

export const metadata: Metadata = { title: "Email previews" };

export default function Page() {
  return <EmailsIndex />;
}
