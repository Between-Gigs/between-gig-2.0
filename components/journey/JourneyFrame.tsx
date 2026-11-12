import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Page } from "@/components/site/Page";

export const journeyPath = "/preview/gigster-journey/";
export const accountPath = journeyPath + "account/";

export function JourneyFrame({ step, children }: { step: "invitation" | "account"; children: ReactNode }) {
  return (
    <Page bare>
      <div data-call-sheet-stage="toolbar" className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
          <Link href="/preview/" className="inline-flex min-h-11 items-center gap-2 text-label-md text-ink-muted hover:text-ink"><ArrowLeft aria-hidden="true" className="size-4" />Preview guide</Link>
          <nav aria-label="Alternative Gigster journey" className="flex flex-wrap items-center gap-x-4 text-label-sm text-ink-muted sm:gap-x-6">
            <Link href={journeyPath} aria-current={step === "invitation" ? "step" : undefined} className="inline-flex min-h-11 items-center aria-current:font-bold aria-current:text-ink-brand">1 · Invitation</Link>
            <Link href={accountPath} aria-current={step === "account" ? "step" : undefined} className="inline-flex min-h-11 items-center aria-current:font-bold aria-current:text-ink-brand">2 · Account</Link>
            <span>3 · Profile &amp; review</span>
          </nav>
        </div>
      </div>
      {children}
    </Page>
  );
}
