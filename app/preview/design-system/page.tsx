import type { Metadata } from "next";
import { DesignSystemPage } from "@/components/ds/DesignSystemPage";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("preview"), title: "Design system" };

export default function Page() {
  return <DesignSystemPage />;
}
