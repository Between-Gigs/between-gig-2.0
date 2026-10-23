import type { Metadata } from "next";
import { DemoStart } from "@/components/demo/DemoStart";

export const metadata: Metadata = {
  title: "Try it: from signup to profile",
  description: "A hands-on demo: sign up, build a profile and see it. Try an optional invite along the way.",
  robots: { index: false },
};

export default function Page() {
  return <DemoStart />;
}
