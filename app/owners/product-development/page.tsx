import type { Metadata } from "next";
import { ProductDevelopment } from "@/components/owners/ProductDevelopment";

export const metadata: Metadata = { title: "Product Development", robots: { index: false, follow: false } };

export default function Page() {
  return <ProductDevelopment />;
}
