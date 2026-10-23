import type { Metadata } from "next";
import { CursorLab } from "@/components/fx/CursorLab";

export const metadata: Metadata = { title: "Mouse effects", robots: { index: false } };

export default function Page() {
  return <CursorLab />;
}
