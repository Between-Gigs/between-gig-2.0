import type { Metadata } from "next";
import { Suspense } from "react";
import { SitePreview } from "@/components/studio/designer/SitePreview";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("studio-site"), title: "Site preview", description: "The pages designed in Studio, as visitors would see them." };

export default function Page() {
  return <Suspense><SitePreview /></Suspense>;
}
