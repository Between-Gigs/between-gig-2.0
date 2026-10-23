import type { Metadata } from "next";
import { CurtainTuner } from "@/components/fx/CurtainTuner";

export const metadata: Metadata = { title: "Curtain tuner", robots: { index: false } };

export default function Page() {
  return <CurtainTuner />;
}
