"use client";
import { Menu, cx } from "@ds/components";
import { BriefcaseBusiness, ChevronDown, LayoutDashboard, LayoutGrid, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { data } from "@/lib/data";
import { basePath } from "@/lib/site";
import { useNavigationMode, usePersonalPreferences } from "./PersonalPreferences";
import type { NavigationMode } from "@/lib/navigation-preferences";
import { useSession } from "@/lib/session";

/** Navigation changes the workspace, never the signed-in identity or their authority. */
export function ExperienceSwitcher({ className }: { className?: string }) {
  const { session } = useSession();
  const router = useRouter();
  const selected = useNavigationMode();
  const { update } = usePersonalPreferences();
  const sampleDeveloper = selected === "developer" && data.kind === "sample";
  if (!session && !sampleDeveloper) return null;
  const experiences: { mode: NavigationMode; href: string; label: string; icon: LucideIcon }[] = [
    { mode: "gigster", href: "/profile/canvas/", label: "Gigster Mode", icon: BriefcaseBusiness },
    ...(session?.role === "owner" || sampleDeveloper ? [{ mode: "owner" as const, href: "/owners/", label: "Owner Mode", icon: LayoutDashboard }] : []),
    ...(session?.role === "owner" || sampleDeveloper ? [{ mode: "developer" as const, href: session?.role === "owner" && data.kind === "live" ? "/owners/developer/" : "/hub/", label: "Developer Mode", icon: LayoutGrid }] : []),
  ];
  if (experiences.length < 2 && !sampleDeveloper) return null;
  const current = experiences.find(item => item.mode === selected) ?? experiences[0];
  const CurrentIcon = current.icon;
  return <span className={className}><Menu align="end" className="max-sm:max-w-72"
    items={experiences.map(item => ({ label: item.label, icon: <item.icon />, checked: item.mode === selected, onSelect: () => {
      update({ mode: item.mode });
      // The public sandbox never carries a live identity. Leave its base path for real account destinations.
      if (basePath === "/hub" && item.mode !== "developer") window.location.assign(item.href);
      else if (data.kind === "live" && item.href === "/hub/") window.location.assign(item.href);
      else router.push(basePath === "/hub" && item.href === "/hub/" ? "/" : item.href);
    } }))}
    trigger={<button type="button" aria-label={`Switch experience: ${current.label}`} className={cx("inline-flex min-h-11 max-sm:size-11 max-sm:justify-center max-sm:p-0 shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-label-md text-ink hover:bg-surface-hover")}>
      <CurrentIcon aria-hidden="true" className="size-4" /><span className="max-sm:sr-only">{current.label}</span><ChevronDown aria-hidden="true" className="hidden size-4 sm:block" />
    </button>} /></span>;
}
