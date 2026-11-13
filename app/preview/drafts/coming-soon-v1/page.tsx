import type { Metadata } from "next";
import { CallSheetHome } from "@/components/home/CallSheetHome";

// Draft: the Coming soon page before the Green Room launch (13 Nov 2026), with its two-step call-sheet form.
export const metadata: Metadata = { title: "Draft · Coming soon v1", robots: { index: false, follow: false } };

export default function Page() {
  return <CallSheetHome />;
}
