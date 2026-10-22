"use client";
import { ToastProvider } from "@ds/components";
import { ClerkLayer } from "@/components/auth/ClerkLayer";
import { DemoSwitcher } from "@/components/demo/DemoSwitcher";
import { clerkEnabled } from "@/lib/auth/clerk";

/** Client-side roots: Clerk (when a publishable key is set), the toast queue and the demo switcher. */
export function Providers({ children }: { children: React.ReactNode }) {
  const app = (
    <ToastProvider>
      <a href="#main" className="sr-only z-toast rounded-md bg-surface-raised px-4 py-2 text-label-md text-ink shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      {children}
      {process.env.NEXT_PUBLIC_DEMO !== "off" && <DemoSwitcher />}
    </ToastProvider>
  );
  return clerkEnabled ? <ClerkLayer>{app}</ClerkLayer> : app;
}
