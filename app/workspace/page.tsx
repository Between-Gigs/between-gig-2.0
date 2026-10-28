import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceHome } from "@/components/workspace/WorkspaceHome";

export const metadata: Metadata = { title: "Workspace", description: "Every Between Gigs project in one place: the site, onboarding experiments, owner tools, Studio and shared artifacts." };

export default function Page() {
  return <Suspense><WorkspaceHome /></Suspense>;
}
