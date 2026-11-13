import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthDesignProvider } from "@/components/auth/authDesign";
import { JoinView } from "@/components/auth/JoinView";

// Draft: Sign up before the Green Room launch (13 Nov 2026). The same sign-up logic as /join/, in the previous AuthTemplate layout.
export const metadata: Metadata = { title: "Draft · Sign up v1", robots: { index: false, follow: false } };

export default function Page() {
  return <AuthDesignProvider design="v1"><Suspense><JoinView /></Suspense></AuthDesignProvider>;
}
