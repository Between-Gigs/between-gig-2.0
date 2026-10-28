import type { Metadata } from "next";
import { ProfileCanvas } from "@/components/canvas/ProfileCanvas";

export const metadata: Metadata = { title: "Edit on your profile" };

export default function Page() {
  return <ProfileCanvas />;
}
