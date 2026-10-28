import type { Metadata } from "next";
import { Overview } from "@/components/home/Overview";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("preview"), title: "Preview guide" };

export default function Page() {
  return <Overview />;
}
