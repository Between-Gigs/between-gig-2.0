import type { Metadata } from "next";
import { VersionHistory } from "@/components/site/VersionHistory";

export const metadata: Metadata = { title: "Version history", robots: { index: false } };

export default function Page() {
  return <VersionHistory />;
}
