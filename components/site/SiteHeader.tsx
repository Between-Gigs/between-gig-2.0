"use client";
import { Avatar, Button, IconButton, Logo, Menu, ThemeToggle, cx, type MenuEntry } from "@ds/components";
import { ChevronDown, LogOut, Menu as MenuIcon, PencilLine, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@/lib/auth/context";
import { useSession } from "@/lib/session";
import { ButtonLink } from "@/components/ui/ButtonLink";

interface NavLink { href: string; label: string }

/**
 * The public site's top bar: logo, the links for whoever is signed in, theme, account. In the owners'
 * workspace (`app`) it spans the full width and the sidebar takes over the links; below lg a menu button
 * opens the sidebar drawer.
 */
export function SiteHeader({ app = false, onOpenNav }: { app?: boolean; onOpenNav?: () => void } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading } = useSession();
  const auth = useAuthActions();

  const links: NavLink[] = app ? [] : session?.role === "owner"
    ? [{ href: "/owners/", label: "Dashboard" }, { href: "/owners/review/", label: "Review" }, { href: "/owners/people/", label: "People" }, { href: "/owners/waitlist/", label: "Waitlist" }, { href: "/emails/", label: "Emails" }]
    : session?.role === "gigster"
      ? [{ href: "/profile/", label: "My profile" }, { href: "/profile/edit/", label: "Edit profile" }]
      : [{ href: "/professionals/", label: "For professionals" }, { href: "/storyboard/", label: "Storyboard" }];

  const current = (href: string) => {
    const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
    // "/owners/" is the dashboard only; its sub-pages light their own tab.
    return href === "/owners/" ? path === href : path === href || path.startsWith(href);
  };

  const signOut = async () => {
    await auth.signOut();
    // Clerk's sign-out navigates by itself (to /login/?signedOut=1).
    if (auth.provider === "sample") router.push("/login/?signedOut=1");
  };

  const menu: MenuEntry[] = session ? [
    { heading: session.role === "owner" ? "Signed in as owner" : "Signed in" },
    ...(session.role === "owner"
      ? links.map((l) => ({ label: l.label, icon: l.href === "/owners/people/" ? <Users /> : undefined, checked: current(l.href) || undefined, onSelect: () => router.push(l.href) }))
      : [{ label: "My profile", icon: <UserRound />, onSelect: () => router.push("/profile/") }, { label: "Edit profile", icon: <PencilLine />, onSelect: () => router.push("/profile/edit/") }]),
    "separator",
    { label: "Sign out", icon: <LogOut />, onSelect: () => void signOut() },
  ] : [];

  return (
    <header className={cx("sticky top-0 z-sticky border-b border-line", app ? "bg-surface" : "bg-bg/85 backdrop-blur-md")}>
      <div className={cx("mx-auto flex h-16 items-center gap-4 px-4 sm:px-6", app ? "max-w-none gap-2 lg:px-5" : "max-w-7xl")}>
        {onOpenNav && <IconButton label="Open owner menu" variant="ghost" icon={<MenuIcon />} onClick={onOpenNav} className="lg:hidden" />}
        <Link href="/" aria-label="Between Gigs home" className="inline-flex min-h-11 items-center rounded-md"><Logo height={28} /></Link>
        {links.length > 0 && (
          <nav aria-label="Main" className={cx("ml-4 hidden items-center gap-1", links.length > 3 ? "lg:flex" : "md:flex")}>
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
            <>
              {!pathname.startsWith("/login") && <ButtonLink href="/login/" size="sm">Sign in</ButtonLink>}
              <span className="md:hidden">
                <Menu align="end" items={links.map((l) => ({ label: l.label, checked: current(l.href) || undefined, onSelect: () => router.push(l.href) }))}
                  trigger={<IconButton label="Menu" variant="ghost" size="sm" icon={<MenuIcon />} />} />
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
