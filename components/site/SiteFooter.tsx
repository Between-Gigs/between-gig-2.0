import { Logo } from "@ds/components";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-body-sm text-ink-subtle sm:px-6">
        <div className="flex items-center gap-3">
          <Logo layout="mark" height={20} />
          <span>Between Gigs 2.0 · Milestone 2 preview. Everyone shown is a fictional sample.</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1">
          <Link className="inline-flex min-h-6 items-center text-ink-muted hover:text-ink-brand" href="/">Overview</Link>
          <Link className="inline-flex min-h-6 items-center text-ink-muted hover:text-ink-brand" href="/emails/">Email previews</Link>
          <a className="inline-flex min-h-6 items-center text-ink-muted hover:text-ink-brand" href="mailto:hello@between-gigs.com">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
