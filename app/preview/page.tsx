import type { Metadata } from "next";
import { Overview } from "@/components/home/Overview";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("preview"), title: "Hub" };

export default function Page() {
  return <Overview />;
}
