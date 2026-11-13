import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthDesignProvider } from "@/components/auth/authDesign";
import { LoginView } from "@/components/auth/LoginView";

// Draft: Log in before the Green Room launch (13 Nov 2026). The same log-in logic as /login/, in the previous AuthTemplate layout.
export const metadata: Metadata = { title: "Draft · Log in v1", robots: { index: false, follow: false } };

export default function Page() {
  return <AuthDesignProvider design="v1"><Suspense><LoginView /></Suspense></AuthDesignProvider>;
}
