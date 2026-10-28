import type { Metadata } from "next";
import { CursorLab } from "@/components/fx/CursorLab";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("preview-cursors"), title: "Mouse effects", robots: { index: false } };

export default function Page() {
  return <CursorLab />;
}
