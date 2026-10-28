import type { Metadata } from "next";
import { ProfileCanvas } from "@/components/canvas/ProfileCanvas";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("profile-canvas"), title: "Edit on your profile" };

export default function Page() {
  return <ProfileCanvas />;
}
