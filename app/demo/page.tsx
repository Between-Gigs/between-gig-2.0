import type { Metadata } from "next";
import { DemoStart } from "@/components/demo/DemoStart";

export const metadata: Metadata = {
  title: "Try it: from invite to profile",
  description: "A hands-on demo: the invite email, sign-up, building a profile and seeing it.",
  robots: { index: false },
};

export default function Page() {
  return <DemoStart />;
}
