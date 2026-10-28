import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceClients } from "@/components/workspace/WorkspaceClients";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("workspace-clients"), title: "Clients · Workspace" };

export default function Page() {
  return <Suspense><WorkspaceClients /></Suspense>;
}
