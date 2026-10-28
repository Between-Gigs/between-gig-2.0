import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceProject } from "@/components/workspace/WorkspaceProject";
import { share, type OgName } from "@/lib/og";
import { projectById, projects } from "@/lib/workspace/projects";

/* One URL per project, so each shares with its own preview image. /workspace/open/?p=… still works. */
export const dynamicParams = false;
export const generateStaticParams = () => projects.map((p) => ({ project: p.id }));

export async function generateMetadata({ params }: { params: Promise<{ project: string }> }): Promise<Metadata> {
  const { project } = await params;
  return { ...share(`ws-${project}` as OgName), title: `${projectById(project)?.name ?? "Project"} · Workspace` };
}

export default async function Page({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;
  return <Suspense><WorkspaceProject projectId={project} /></Suspense>;
}
