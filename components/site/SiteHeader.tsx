"use client";
import { Avatar, IconButton, Logo, Menu, ThemeToggle, cx, type MenuEntry } from "@ds/components";
import { LogOut, Menu as MenuIcon, PencilLine, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@/lib/auth/context";
import { useSession } from "@/lib/session";

interface NavLink { href: string; label: string }

/**
 * The public site's top bar: logo, the links for whoever is signed in, theme, account. In the owners'
 * workspace (`app`) it spans the full width, holds only the theme switch, and the sidebar takes over the
 * links and the account; below lg a menu button opens the sidebar drawer.
 */
export function SiteHeader({ app = false, onOpenNav }: { app?: boolean; onOpenNav?: () => void } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading } = useSession();
  const auth = useAuthActions();

  const links: NavLink[] = app ? [] : session?.role === "owner"
    ? [{ href: "/owners/", label: "Dashboard" }, { href: "/owners/review/", label: "Review" }, { href: "/owners/people/", label: "People" }, { href: "/owners/waitlist/", label: "Waitlist" }, { href: "/emails/", label: "Emails" }]
    : session?.role === "gigster"
      ? [{ href: "/profile/", label: "My profile" }, { href: "/profile/canvas/", label: "Edit profile" }]
      : [{ href: "/professionals/", label: "For professionals" }, { href: "/storyboard/", label: "Storyboard" }];

  // Only the most specific matching link is current: on /profile/canvas/ that's "Edit profile", not "My profile";
  // on /owners/review/ it's "Review", not "Dashboard".
  const raw = pathname.endsWith("/") ? pathname : `${pathname}/`;
  // The step-by-step questionnaire is the other way to edit it.
  const path = raw.startsWith("/profile/edit/") ? "/profile/canvas/" : raw;
  const best = links.map((l) => l.href).filter((h) => path.startsWith(h)).sort((a, b) => b.length - a.length)[0];
  const current = (href: string) => href === best;

  const signOut = async () => {
    await auth.signOut();
    // Clerk's sign-out navigates by itself (to /login/?signedOut=1).
    if (auth.provider === "sample") router.push("/login/?signedOut=1");
  };

  const displayName = session ? (session.name || session.email).replace(/\s*\(.*\)$/, "") : "";
  const menu: MenuEntry[] = session ? [
    { heading: session.role === "owner" ? "Signed in as owner" : "Signed in" },
    ...(session.role === "owner"
      ? links.map((l) => ({ label: l.label, icon: l.href === "/owners/people/" ? <Users /> : undefined, checked: current(l.href) || undefined, onSelect: () => router.push(l.href) }))
      : [{ label: "My profile", icon: <UserRound />, onSelect: () => router.push("/profile/") }, { label: "Edit profile", icon: <PencilLine />, onSelect: () => router.push("/profile/canvas/") }]),
    "separator",
    { label: "Log out", icon: <LogOut />, onSelect: () => void signOut() },
  ] : [];

  return (
    // Swiss (product screens): the same row on a 12-column grid from md (logo · links · account), closed by a 4px ink rule.
    <header className={cx("sticky top-0 embedded:hidden! z-sticky border-b border-line", app ? "bg-surface" : "bg-bg swiss:border-b-0")}>
      <div className={cx("mx-auto px-4 sm:px-6", app ? "max-w-none lg:px-5" : "max-w-7xl")}>
      <div className={cx("flex h-16 items-center gap-4 lg:h-20", app ? "h-16! gap-2" : "swiss:border-b-4 swiss:border-line-strong swiss:md:grid swiss:md:grid-cols-12 swiss:md:gap-x-6")}>
        {onOpenNav && <IconButton label="Open owner menu" variant="ghost" icon={<MenuIcon />} onClick={onOpenNav} className="lg:hidden" />}
        <div className="flex flex-1 items-center swiss:md:col-span-3">
          <Link href="/" aria-label="Between Gigs home" className="inline-flex min-h-11 shrink-0 items-center rounded-md"><Logo height={28} className="hidden xs:block" /><Logo layout="mark" height={28} className="xs:hidden" /></Link>
        </div>
        {/* Airbnb-style: the page links sit in the middle, the current one underlined. */}
        {links.length > 0 && (
          <nav aria-label="Main" className={cx("hidden items-center gap-2 swiss:md:gap-8", links.length > 3 ? "lg:flex swiss:lg:col-span-7 swiss:lg:gap-5" : "md:flex swiss:md:col-span-5 swiss:md:col-start-5")}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={current(l.href) ? "page" : undefined}
                className={cx("relative inline-flex min-h-11 items-center px-3 text-label-md transition-colors duration-fast",
                  "swiss:px-0 swiss:font-display swiss:font-semibold swiss:text-ink swiss:underline-offset-8",
                  current(l.href) ? "text-ink after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-ink swiss:underline swiss:decoration-4 swiss:after:hidden" : "text-ink-muted hover:text-ink swiss:decoration-2 swiss:hover:underline")}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
        <div className={cx("flex flex-1 items-center justify-end gap-2 xs:gap-3", links.length > 3 ? "swiss:md:col-span-9 swiss:lg:col-span-2" : "swiss:md:col-span-3")}>
          <ThemeToggle size="sm" showLabel={false} className="pr-0.5!" />
          {app ? null : loading ? <span className="h-11 w-20" aria-hidden="true" /> : session ? (
            <Menu align="end" items={menu}
              header={
                <div className="flex items-center gap-3 px-3 pt-2 pb-3">
                  <Avatar name={displayName} size="lg" className="swiss:rounded-none" />
                  <div className="min-w-0"><p className="truncate text-label-md text-ink">{session.name || "Gigster"}</p><p className="truncate text-body-sm text-ink-muted">{session.email}</p></div>
                </div>
              }
              trigger={
                // The avatar is the account button: a ring that brightens on hover and while the menu is open.
                <button type="button" aria-label={`Account: ${session.name || session.email}`}
                  className="grid size-11 place-items-center rounded-full ring-2 ring-line transition-shadow duration-fast hover:ring-ink-brand aria-expanded:ring-ink-brand swiss:rounded-none swiss:ring-0 swiss:hover:ring-2 swiss:hover:ring-line-strong swiss:aria-expanded:ring-4 swiss:aria-expanded:ring-line-strong">
                  <Avatar name={displayName} size="md" className="swiss:size-11 swiss:rounded-none swiss:text-label-md" />
                </button>
              } />
          ) : (
            <>
              {!pathname.startsWith("/login") && <Link href="/login/" className="hidden min-h-11 items-center rounded-full px-3 text-label-md text-ink hover:bg-surface-hover swiss:rounded-none swiss:px-0 swiss:font-display swiss:font-semibold swiss:underline-offset-8 swiss:hover:bg-transparent swiss:hover:underline sm:inline-flex">Log in</Link>}
              <Menu align="end" items={[...links.map((l) => ({ label: l.label, checked: current(l.href) || undefined, onSelect: () => router.push(l.href) })), "separator" as const, { label: "Log in", icon: <UserRound />, onSelect: () => router.push("/login/") }]}
                trigger={
                  <button type="button" aria-label="Menu" className="grid size-11 place-items-center rounded-full ring-2 ring-line transition-shadow duration-fast hover:ring-ink-brand aria-expanded:ring-ink-brand swiss:rounded-none swiss:ring-line-strong swiss:md:hidden">
                    <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-surface-selected text-ink-brand swiss:rounded-none swiss:bg-transparent swiss:text-ink"><UserRound className="size-4" /></span>
                  </button>
                } />
            </>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
