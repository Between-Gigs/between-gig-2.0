import type { Metadata } from "next";
import { SimpleProfile } from "@/components/simple/SimpleProfile";
import "@/styles/simple-profile.css";

export const metadata: Metadata = { title: "Your profile (simple editor)", robots: { index: false } };

/** A/B test: a standalone, unstyled profile page with plain editing, against /profile/canvas/. */
export default function Page() {
  return <SimpleProfile />;
}
