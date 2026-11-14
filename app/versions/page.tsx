import type { Metadata } from "next";
import { share } from "@/lib/og";
import { VersionHistory } from "@/components/site/VersionHistory";

export const metadata: Metadata = { ...share("versions"), title: "Version history", robots: { index: false } };

export default function Page() {
  return <VersionHistory />;
}
