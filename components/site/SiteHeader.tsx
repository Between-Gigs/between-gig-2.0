"use client";
import { Avatar, Badge, Button, Logo, Menu, ThemeToggle, cx, type MenuEntry } from "@ds/components";
import { ChevronDown, LogOut, PencilLine, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { data } from "@/lib/data";
import { useSession } from "@/lib/session";
import { ButtonLink } from "@/components/ui/ButtonLink";

interface NavLink { href: string; label: string }

/** The public site's top bar: logo, the links for whoever is signed in, theme, account. */
export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading } = useSession();

  const links: NavLink[] = session?.role === "owner"
    ? [{ href: "/owners/people/", label: "People" }, { href: "/emails/", label: "Emails" }]
    : session?.role === "gigster"
      ? [{ href: "/profile/", label: "My profile" }, { href: "/profile/edit/", label: "Edit profile" }]
      : [];

  const current = (href: string) => pathname === href || pathname === href.replace(/\/$/, "");

  const signOut = async () => {
    await data.auth.signOut();
    router.push("/login/?signedOut=1");
  };

  const menu: MenuEntry[] = session ? [
    { heading: session.role === "owner" ? "Signed in as owner" : "Signed in" },
    ...(session.role === "owner"
      ? [{ label: "People", icon: <Users />, onSelect: () => router.push("/owners/people/") }]
      : [{ label: "My profile", icon: <UserRound />, onSelect: () => router.push("/profile/") }, { label: "Edit profile", icon: <PencilLine />, onSelect: () => router.push("/profile/edit/") }]),
    "separator",
    { label: "Sign out", icon: <LogOut />, onSelect: () => void signOut() },
  ] : [];

  return (
    <header className="sticky top-0 z-sticky border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Between Gigs home" className="rounded-md"><Logo height={28} /></Link>
        {links.length > 0 && (
          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={current(l.href) ? "page" : undefined}
                className={cx("relative inline-flex min-h-10 items-center rounded-md px-3 text-label-md transition-colors duration-fast",
                  current(l.href) ? "text-ink after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-action" : "text-ink-muted hover:text-ink")}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden lg:block"><Badge tone="neutral" size="sm">Fictional sample</Badge></span>
          <ThemeToggle size="sm" showLabel={false} />
          {loading ? <span className="h-8 w-20" aria-hidden="true" /> : session ? (
            <Menu align="end" items={menu}
              header={<div className="px-3 pt-1 pb-2"><p className="truncate text-label-md text-ink">{session.name || "Gigster"}</p><p className="truncate text-body-sm text-ink-muted">{session.email}</p></div>}
              trigger={
                <Button variant="ghost" size="sm" aria-label={`Account: ${session.name || session.email}`} iconEnd={<ChevronDown />} className="pl-1.5">
                  <Avatar name={(session.name || session.email).replace(/\s*\(.*\)$/, "")} size="sm" />
                  <span className="hidden max-w-32 truncate sm:inline">{session.name.split(" ")[0] || "Account"}</span>
                </Button>
              } />
          ) : (
            !pathname.startsWith("/login") && <ButtonLink href="/login/" size="sm">Sign in</ButtonLink>
          )}
        </div>
      </div>
    </header>
  );
}
