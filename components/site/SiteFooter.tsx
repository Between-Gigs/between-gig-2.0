import { Logo } from "@ds/components/Logo";
import Link from "next/link";
import { data } from "@/lib/data";
import { showsPreviewNote } from "@/lib/preview-note";

const linkClass = "inline-flex min-h-11 items-center text-body-sm text-ink hover:underline hover:underline-offset-4 sm:min-h-9";

/**
 * Airbnb-style footer: a light band with three short columns, then one line with the small print. On the Swiss product
 * screens it sits on the page under a 4px ink rule, its column labels set as small uppercase eyebrows.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface-sunken embedded:hidden! swiss:mt-4 swiss:border-t-0 swiss:bg-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="grid gap-x-8 gap-y-8 py-10 sm:grid-cols-3 swiss:gap-x-6 swiss:border-t-4 swiss:border-line-strong swiss:pt-5 swiss:pb-8">
        <div className="grid content-start gap-1">
          <h2 className="mb-2 text-label-md text-ink swiss:text-eyebrow swiss:uppercase">Support</h2>
          <a className={linkClass} href="mailto:hello@between-gigs.com">hello@between-gigs.com</a>
          <p className="text-body-sm text-ink-muted">Entertainment-industry talent for people, businesses, and organizations.</p>
        </div>
        <nav aria-label="Explore Between Gigs" className="grid content-start gap-1">
          <h2 className="mb-2 text-label-md text-ink swiss:text-eyebrow swiss:uppercase">Explore</h2>
          <Link className={linkClass} href="/professionals/">For professionals</Link>
          <Link className={linkClass} href="/storyboard/">Storyboard</Link>
        </nav>
        <nav aria-label="Legal and standards" className="grid content-start gap-1">
          <h2 className="mb-2 text-label-md text-ink swiss:text-eyebrow swiss:uppercase">Legal</h2>
          <Link className={linkClass} href="/privacy/">Privacy</Link>
          <Link className={linkClass} href="/terms/">Terms</Link>
          <Link className={linkClass} href="/provider-standards/">Provider standards</Link>
          <Link className={linkClass} href="/licensing-insurance/">Licensing &amp; insurance</Link>
        </nav>
      </div>
      </div>
      <div className="border-t border-line swiss:border-t-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-5 text-body-sm text-ink-muted swiss:border-t swiss:border-line">
          <Link href="/" aria-label="Between Gigs home" className="inline-flex min-h-11 items-center rounded-md"><Logo layout="mark" height={20} /></Link>
          <span>© 2026 Between Gigs · Extraordinary Talent. Everyday Solutions.</span>
          <span>BETWEEN GIGS™ is a trademark of Between Gigs.</span>
          {showsPreviewNote(data.kind) && <span>Preview build: people in the sample data are fictional. <Link href="/preview/" className="underline underline-offset-2 hover:text-ink">Preview guide</Link></span>}
        </div>
        </div>
      </div>
    </footer>
  );
}
