import type { Metadata } from "next";
import { PreviewAccess } from "@/components/site/PreviewAccess";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

export default function Page() {
  return <PreviewAccess />;
}
