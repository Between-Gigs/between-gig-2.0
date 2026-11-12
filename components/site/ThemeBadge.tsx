"use client";
import { Palette } from "lucide-react";
import Link from "next/link";
import { looks } from "@/lib/look";
import { useLook, useUnstyled } from "./LookSync";

/** Names the theme in use (and Unstyled, when on) and opens the design system, where every theme can be tried. */
export function ThemeBadge({ className }: { className?: string }) {
  const look = useLook();
  const plain = useUnstyled();
  return (
    <Link href="/preview/design-system/#themes" className={className ?? "inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-label-md text-ink hover:bg-surface-hover"}>
      <Palette aria-hidden="true" className="size-4" />
      <span>Theme: <b className="font-semibold">{looks[look].name}</b>{plain && " · Unstyled"}</span>
      <span className="text-ink-muted underline underline-offset-2">Change</span>
    </Link>
  );
}
