import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientPortal } from "@/components/workspace/ClientPortal";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("workspace-portal"), title: "Client portal" };

export default function Page() {
  return <Suspense><ClientPortal /></Suspense>;
}
