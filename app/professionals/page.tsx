import type { Metadata } from "next";
import { ForProfessionals } from "@/components/landing/ForProfessionals";
import { share } from "@/lib/og";

export const metadata: Metadata = {
  ...share("professionals"),
  title: "For professionals",
  description: "Your skills don't stop when the cameras do. You set your rates, choose your projects and decide when you're available. Free to join in Los Angeles.",
};

export default function Page() {
  return <ForProfessionals />;
}
