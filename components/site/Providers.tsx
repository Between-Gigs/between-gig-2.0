"use client";
import { ToastProvider } from "@ds/components";
import { DemoSwitcher } from "@/components/demo/DemoSwitcher";

/** Client-side roots: the toast queue and the demo switcher. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <a href="#main" className="sr-only z-toast rounded-md bg-surface-raised px-4 py-2 text-label-md text-ink shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      {children}
      {process.env.NEXT_PUBLIC_DEMO !== "off" && <DemoSwitcher />}
    </ToastProvider>
  );
}
