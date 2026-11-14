import type { Metadata } from "next";
import { PreviewDirectory } from "@/components/preview/PreviewDirectory";
export const metadata: Metadata = { title: "Funnel previews", robots: { index: false, follow: false } };
export default function Page() { return <PreviewDirectory kind="funnels" />; }
