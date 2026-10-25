"use client";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { basePath } from "@/lib/site";
import { StudioProvider, useStudio } from "@/lib/studio/store";
import type { Breakpoint } from "@/lib/studio/types";
import { RenderElement } from "./render";

/** /studio/site/?p=slug: the Studio site as visitors see it, from this browser's saved workspace. */
export function SitePreview() {
  return <StudioProvider><Site /></StudioProvider>;
}

function Site() {
  const { base } = useStudio();
  const slug = useSearchParams().get("p") ?? "";
  const [bp, setBp] = React.useState<Breakpoint>("base");
  React.useEffect(() => {
    const tablet = window.matchMedia("(max-width: 991px)"), phone = window.matchMedia("(max-width: 478px)");
    const on = () => setBp(phone.matches ? "phone" : tablet.matches ? "tablet" : "base");
    on(); tablet.addEventListener("change", on); phone.addEventListener("change", on);
    return () => { tablet.removeEventListener("change", on); phone.removeEventListener("change", on); };
  }, []);
  if (!base) return null;
  const page = base.pages.find((p) => p.slug === slug) ?? base.pages.find((p) => p.slug === "") ?? base.pages[0];
  const href = (h: string) => {
    const target = base.pages.find((p) => `/${p.slug}` === h || (h === "/" && p.slug === ""));
    return target ? `${basePath}/studio/site/?p=${target.slug}` : h.startsWith("/") ? `${basePath}${h}` : h;
  };
  return (
    <>
      <main id="main"><RenderElement el={page.root} opts={{ base, bp, mode: "preview", href }} /></main>
      <nav aria-label="Studio" className="fixed right-4 bottom-4 z-toast">
        <a href={`${basePath}/studio/`} className="inline-flex h-11 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-label-md text-ink shadow-md hover:bg-surface-hover">
          <ArrowLeft className="size-4" aria-hidden="true" />Back to Studio
        </a>
      </nav>
    </>
  );
}
