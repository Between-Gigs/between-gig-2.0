import { Logo } from "@ds/components/Logo";
import Link from "next/link";
import { data } from "@/lib/data";
import { showsPreviewNote } from "@/lib/preview-note";

const linkClass = "inline-flex min-h-11 items-center text-body-md text-ink hover:underline hover:underline-offset-4 sm:min-h-9";

/** Airbnb-style footer: a light band with three short columns, then one line with the small print. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface-sunken embedded:hidden!">
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div className="grid content-start gap-1">
          <h2 className="mb-2 text-label-md text-ink">Support</h2>
          <a className={linkClass} href="mailto:hello@between-gigs.com">hello@between-gigs.com</a>
          <p className="text-body-sm text-ink-muted">Entertainment-industry talent for people, businesses, and organizations.</p>
        </div>
        <nav aria-label="Explore Between Gigs" className="grid content-start gap-1">
          <h2 className="mb-2 text-label-md text-ink">Explore</h2>
          <Link className={linkClass} href="/professionals/">For professionals</Link>
          <Link className={linkClass} href="/storyboard/">Storyboard</Link>
        </nav>
        <nav aria-label="Legal and standards" className="grid content-start gap-1">
          <h2 className="mb-2 text-label-md text-ink">Legal</h2>
          <Link className={linkClass} href="/privacy/">Privacy</Link>
          <Link className={linkClass} href="/terms/">Terms</Link>
          <Link className={linkClass} href="/provider-standards/">Provider standards</Link>
          <Link className={linkClass} href="/licensing-insurance/">Licensing &amp; insurance</Link>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-5 text-body-sm text-ink-muted sm:px-6">
          <Link href="/" aria-label="Between Gigs home" className="inline-flex min-h-11 items-center rounded-md"><Logo layout="mark" height={20} /></Link>
          <span>© 2026 Between Gigs · Extraordinary Talent. Everyday Solutions.</span>
          <span>BETWEEN GIGS™ is a trademark of Between Gigs.</span>
          {showsPreviewNote(data.kind) && <span>Preview build: people in the sample data are fictional. <Link href="/preview/" className="underline underline-offset-2 hover:text-ink">Preview guide</Link></span>}
        </div>
      </div>
    </footer>
  );
}
