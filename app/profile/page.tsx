import type { Metadata } from "next";
import { MyProfile } from "@/components/profile/MyProfile";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("profile"), title: "My profile" };

export default function Page() {
  return <MyProfile />;
}
