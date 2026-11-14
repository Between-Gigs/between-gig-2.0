import type { Metadata } from "next";
import { GigsterBrowse } from "@/components/people/GigsterBrowse";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("gigsters"), title: "Gigsters" };

export default function Page() {
  return <GigsterBrowse />;
}
