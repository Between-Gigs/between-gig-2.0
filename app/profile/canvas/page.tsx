import type { Metadata } from "next";
import { GigsterEditor } from "@/components/gigster/editor/GigsterEditor";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("profile-canvas"), title: "Your Gigster profile" };

export default function Page() {
  return <GigsterEditor />;
}
