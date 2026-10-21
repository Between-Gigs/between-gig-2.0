import type { Metadata } from "next";
import { Overview } from "@/components/home/Overview";

export const metadata: Metadata = { title: "Preview guide" };

export default function Page() {
  return <Overview />;
}
