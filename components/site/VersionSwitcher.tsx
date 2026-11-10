"use client";
import { Button, Menu, type MenuEntry } from "@ds/components";
import { ChevronUp, History } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { currentVersion, olderVersionsOnline, versionUrl, versions } from "@/lib/versions";

/**
 * Switch the whole site to an older design version, on the same page. Each older version is its own build at
 * <base>/v/<n>/ (Pages preview only); its own pill switches back. "Version history" lists what changed in each.
 */
export function VersionSwitcher({ className }: { className?: string }) {
  const path = usePathname() || "/";
  const router = useRouter();
  const go = (n: number) => {
    const v = versions.find((x) => x.n === n)!;
    if (v.current) return;
    window.location.assign(versionUrl(v, path) + window.location.search);
  };
  const items: MenuEntry[] = [
    { heading: "Design versions" },
    ...versions.map((v): MenuEntry => ({
      label: `v${v.n} · ${v.name}${v.current ? " (current)" : ""}`,
      description: v.date,
      checked: !!v.current,
      disabled: !v.current && !olderVersionsOnline,
      onSelect: () => go(v.n),
    })),
    "separator",
    { label: "Version history", icon: <History aria-hidden="true" />, onSelect: () => router.push("/versions/") },
  ];
  // Only where the older versions are published (the Pages preview); elsewhere there is nothing to switch to.
  if (!olderVersionsOnline) return null;
  return (
    <Menu className={className} items={items}
      trigger={<Button size="sm" variant="secondary" iconEnd={<ChevronUp aria-hidden="true" />}>Version {currentVersion.n} · {currentVersion.name}</Button>} />
  );
}
