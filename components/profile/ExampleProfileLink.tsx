"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import * as React from "react";
import type { Listed } from "@/lib/profile/browse";
import { data } from "@/lib/data";
import type { ProfessionalExample } from "@/lib/professional-examples";

export function usePublishedExamples() {
  const [rows, setRows] = React.useState<Listed[] | null>(null);
  React.useEffect(() => {
    if (!data.demo) return;
    let active = true;
    void data.demo.publicExamples().then((items) => { if (active) setRows(items); });
    return () => { active = false; };
  }, []);
  return rows;
}

/** Only published sample handles appear on the marketing page. */
export function ExampleProfileLink({ example, handle }: { example: ProfessionalExample; handle?: string }) {
  if (!handle) return null;
  return (
    <Link href={`/p/${handle}/`} aria-label={`View ${example.name}'s full profile`}
      className="inline-flex min-h-11 w-fit items-center gap-1 text-label-md text-link underline underline-offset-4">
      View full profile <ArrowUpRight aria-hidden="true" className="size-4" />
    </Link>
  );
}
