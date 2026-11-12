"use client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { data } from "@/lib/data";
import { professionalExamples } from "@/lib/professional-examples";

function ReferenceLink() {
  const params = useSearchParams();
  const example = professionalExamples.find((item) => item.id === params.get("example"));
  if (!example) return null;
  return (
    <aside aria-label="Example profile" className="border-b border-line bg-surface-sunken">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <span className="text-label-sm text-ink-muted">Alternative journey · Profile &amp; review</span>
        <Link href={`/p/${example.id}/`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-label-md text-ink-brand underline underline-offset-4">
          View {example.name}’s completed example<ArrowUpRight aria-hidden="true" className="size-4" /><span className="sr-only"> (opens in a new tab)</span>
        </Link>
      </div>
    </aside>
  );
}

export function ExampleReference() {
  return data.kind === "sample" ? <Suspense fallback={null}><ReferenceLink /></Suspense> : null;
}
