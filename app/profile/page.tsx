import type { Metadata } from "next";
import { MyProfile } from "@/components/profile/MyProfile";

export const metadata: Metadata = { title: "My profile" };

export default function Page() {
  return <MyProfile />;
}
