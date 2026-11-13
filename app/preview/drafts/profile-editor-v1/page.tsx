import type { Metadata } from "next";
import { ProfileCanvas } from "@/components/canvas/ProfileCanvas";
import { GigsterAccess } from "@/components/profile/GigsterAccess";

// Draft: the edit-on-page profile editor before the Green Room rebuild (13 Nov 2026). The same draft, autosave and
// submit as /profile/canvas/, which now opens the new editor (components/gigster/editor).
export const metadata: Metadata = { title: "Draft · Profile editor v1", robots: { index: false, follow: false } };

export default function Page() {
  return <GigsterAccess><ProfileCanvas /></GigsterAccess>;
}
