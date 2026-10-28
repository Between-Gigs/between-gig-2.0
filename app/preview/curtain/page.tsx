import type { Metadata } from "next";
import { CurtainTuner } from "@/components/fx/CurtainTuner";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("preview-curtain"), title: "Curtain tuner", robots: { index: false } };

export default function Page() {
  return <CurtainTuner />;
}
