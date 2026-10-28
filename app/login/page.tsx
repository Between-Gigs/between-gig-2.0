import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginView } from "@/components/auth/LoginView";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("login"), title: "Sign in" };

export default function Page() {
  return <Suspense><LoginView /></Suspense>;
}
