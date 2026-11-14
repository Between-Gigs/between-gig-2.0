import type { Metadata } from "next";
import { share } from "@/lib/og";
import { ExampleProfiles } from "@/components/profile/ExampleProfiles";

export const metadata: Metadata = { ...share("preview-profiles"), title: "Sample Gigster profiles" };

export default function Page() {
  return <ExampleProfiles />;
}
