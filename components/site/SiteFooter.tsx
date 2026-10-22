import { Logo } from "@ds/components/Logo";
import Link from "next/link";

const linkClass = "inline-flex min-h-11 items-center text-body-sm text-ink-muted hover:text-ink-brand sm:min-h-8";

/** Footer from the live site's Storyboard: brand line, support, explore, legal. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="grid content-start gap-3">
          <Link href="/" aria-label="Between Gigs home" className="inline-flex min-h-11 w-fit items-center rounded-md"><Logo height={28} /></Link>
          <p className="font-display text-heading-sm text-ink">Extraordinary Talent.<br />Everyday Solutions.</p>
        </div>
        <div className="grid content-start gap-1.5">
          <h2 className="mb-1 text-label-sm text-ink">Support</h2>
          <a className={linkClass} href="mailto:hello@between-gigs.com">hello@between-gigs.com</a>
          <p className="text-body-sm text-ink-subtle">Entertainment-industry talent for people, businesses, and organizations.</p>
        </div>
        <nav aria-label="Explore Between Gigs" className="grid content-start gap-1.5">
          <h2 className="mb-1 text-label-sm text-ink">Explore</h2>
          <Link className={linkClass} href="/professionals/">For professionals</Link>
          <Link className={linkClass} href="/storyboard/">Storyboard</Link>
        </nav>
        <nav aria-label="Legal and standards" className="grid content-start gap-1.5">
          <h2 className="mb-1 text-label-sm text-ink">Legal</h2>
          <Link className={linkClass} href="/privacy/">Privacy</Link>
          <Link className={linkClass} href="/terms/">Terms</Link>
          <Link className={linkClass} href="/provider-standards/">Provider standards</Link>
          <Link className={linkClass} href="/licensing-insurance/">Licensing &amp; insurance</Link>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-body-sm text-ink-subtle sm:px-6">© 2026 Between Gigs. All rights reserved. BETWEEN GIGS™ is a trademark of Between Gigs. · Preview build: people in the sample data are fictional. <Link href="/preview/" className="underline underline-offset-2 hover:text-ink-brand">Preview guide</Link></p>
      </div>
    </footer>
  );
}
