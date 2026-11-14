import type { Metadata } from "next";
import { SocialPreview } from "@/components/preview/SocialPreview";
export const metadata: Metadata = { title: "Social Previews", robots: { index: false, follow: false } };
export default function Page() { return <SocialPreview />; }
