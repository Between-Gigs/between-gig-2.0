import type { Metadata } from "next";
import { ComingSoon } from "@/components/landing/ComingSoon";
import { share } from "@/lib/og";

export const metadata: Metadata = {
  ...share("home"),
  title: { absolute: "Between Gigs · Extraordinary talent. Everyday solutions." },
  description: "Entertainment-industry talent, beyond the set. Between Gigs is coming soon. Join the Los Angeles Call Sheet: create your Gigster profile.",
};

export default function Page() {
  return <ComingSoon />;
}
