import type { Metadata } from "next";
import { ComingSoon } from "@/components/landing/ComingSoon";
import { share } from "@/lib/og";

export const metadata: Metadata = {
  ...share("home"),
  title: { absolute: "Between Gigs · Extraordinary talent. Everyday solutions." },
};

export default function Page() {
  return <ComingSoon />;
}
