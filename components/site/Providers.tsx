"use client";
import { ToastProvider } from "@ds/components";
import { ClerkLayer } from "@/components/auth/ClerkLayer";
import { clerkEnabled } from "@/lib/auth/clerk";
import { HorizonComets } from "./HorizonComets";
import { SampleHook } from "./SampleHook";

/** Client-side roots: Clerk (when a publishable key is set), and the toast queue. */
export function Providers({ children }: { children: React.ReactNode }) {
  const app = (
    <ToastProvider>
      <a href="#main" className="sr-only z-toast rounded-md bg-surface-raised px-4 py-2 text-label-md text-ink shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      {children}
      <SampleHook />
      <HorizonComets />
    </ToastProvider>
  );
  return clerkEnabled ? <ClerkLayer>{app}</ClerkLayer> : app;
}
