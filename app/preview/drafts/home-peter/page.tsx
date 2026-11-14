import type { Metadata } from "next";
import { PeterHomePreview } from "./PeterHomePreview";

// Disposable review route. The public homepage and shared header are deliberately untouched.
export const metadata: Metadata = {
  title: "Homepage direction · Review preview",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PeterHomePreview />;
}
