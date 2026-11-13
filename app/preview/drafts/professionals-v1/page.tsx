import type { Metadata } from "next";
import { ProfessionalsLanding } from "@/components/funnel/ProfessionalsLanding";

// Draft: For professionals before the Green Room launch (13 Nov 2026), with its two-step call-sheet form.
export const metadata: Metadata = { title: "Draft · For professionals v1", robots: { index: false, follow: false } };

export default function Page() {
  return <ProfessionalsLanding />;
}
