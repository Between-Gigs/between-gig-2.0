import type { Metadata } from "next";
import { ForProfessionals } from "@/components/landing/ForProfessionals";
import { share } from "@/lib/og";

export const metadata: Metadata = {
  ...share("professionals"),
  // The card the client liked (14 Nov 2026): its line is the page title too.
  title: { absolute: "Extraordinary Talent. Everyday Help. · Between Gigs" },
};

export default function Page() {
  return <ForProfessionals />;
}
