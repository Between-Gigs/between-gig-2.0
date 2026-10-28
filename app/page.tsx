import type { Metadata } from "next";
import { CallSheetHome } from "@/components/home/CallSheetHome";
import { share } from "@/lib/og";

export const metadata: Metadata = {
  ...share("home"),
  title: { absolute: "Between Gigs · Extraordinary talent. Everyday solutions." },
  description: "Entertainment-industry talent, beyond the set. Between Gigs is coming soon. Get on the Los Angeles call sheet.",
};

export default function Page() {
  return <CallSheetHome />;
}
