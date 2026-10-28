import type { Metadata } from "next";
import { WorkspaceTemplates } from "@/components/workspace/WorkspaceTemplates";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("workspace-templates"), title: "Templates · Workspace" };

export default function Page() {
  return <WorkspaceTemplates />;
}
