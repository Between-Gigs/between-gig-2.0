import type { Metadata } from "next";
import { ExampleProfiles } from "@/components/profile/ExampleProfiles";

export const metadata: Metadata = { title: "Sample Gigster profiles" };

export default function Page() {
  return <ExampleProfiles />;
}
