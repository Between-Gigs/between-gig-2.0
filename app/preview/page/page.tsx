import type { Metadata } from "next";
import { Page } from "@/components/site/Page";
export const metadata: Metadata = { title: "Page preview", robots: { index: false, follow: false } };
export default function PreviewPage() {
  return <Page><h1 className="font-display text-heading-md text-ink">Choose a page to preview</h1><p role="alert" className="mt-3 text-body-md text-ink-muted">Open a public-page card from the Hub. External URLs and private management routes cannot be embedded here.</p></Page>;
}
