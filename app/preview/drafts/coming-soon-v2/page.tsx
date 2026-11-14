import type { Metadata } from "next";
import { ComingSoonV2 } from "@/components/landing/ComingSoonV2";

// Draft: the Green Room Coming soon home before the client's logo-led hero (14 Nov 2026).
export const metadata: Metadata = { title: "Draft · Coming soon v2", robots: { index: false, follow: false } };

export default function Page() {
  return <ComingSoonV2 />;
}
