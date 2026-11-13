"use client";
import { Menu, cx } from "@ds/components";
import { BriefcaseBusiness, ChevronDown, LayoutDashboard, LayoutGrid, type LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { basePath } from "@/lib/site";
import { useSession } from "@/lib/session";

const experiences: { href: string; label: string; short: string; icon: LucideIcon }[] = [
  { href: "/profile/canvas/", label: "Gigster Experience · edit my profile", short: "Gigster", icon: BriefcaseBusiness },
  { href: "/owners/", label: "Owner Experience · dashboard", short: "Owner", icon: LayoutDashboard },
  { href: "/hub/", label: "Hub · all work in progress", short: "Hub", icon: LayoutGrid },
];

/** Navigation changes the workspace, never the signed-in identity or their authority. */
export function ExperienceSwitcher({ className }: { className?: string }) {
  const { session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  if (session?.role !== "owner") return null;
  const selected = pathname.startsWith("/profile") ? 0 : pathname.startsWith("/hub") || pathname.startsWith("/preview") || (basePath === "/hub" && pathname === "/") ? 2 : 1;
  const CurrentIcon = experiences[selected].icon;
  return <Menu align="end" className={className}
    items={experiences.map((item, i) => ({ label: item.label, icon: <item.icon />, checked: i === selected || undefined, onSelect: () => router.push(basePath === "/hub" && item.href === "/hub/" ? "/" : item.href) }))}
    trigger={<button type="button" aria-label="Switch experience" className={cx("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-label-md text-ink hover:bg-surface-hover")}>
      <CurrentIcon aria-hidden="true" className="size-4" /><span>{experiences[selected].short}</span><ChevronDown aria-hidden="true" className="size-4" />
    </button>} />;
}
