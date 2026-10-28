import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceProject } from "@/components/workspace/WorkspaceProject";

export const metadata: Metadata = { title: "Project · Workspace" };

export default function Page() {
  return <Suspense><WorkspaceProject /></Suspense>;
}
