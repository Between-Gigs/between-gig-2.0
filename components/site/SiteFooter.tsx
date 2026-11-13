import { Logo } from "@ds/components/Logo";
import Link from "next/link";
import { data } from "@/lib/data";
import { showsPreviewNote } from "@/lib/preview-note";
import { VersionSwitcher } from "./VersionSwitcher";

const linkClass = "inline-flex min-h-11 w-fit items-center text-body-md text-ink underline-offset-4 hover:text-ink-brand hover:underline sm:min-h-9";
const label = "mb-2 text-eyebrow text-ink-muted uppercase";

/**
 * The footer in the Green Room style (Justin's Flow): the cream page closed by a strong forest rule, the logo with the
 * brand line in serif and the contact address on the left, two short link columns on the right, and one thin-ruled
 * line of small print. No trademark line (removed at the client's request, 13 Nov 2026).
 */
export function SiteFooter() {
  return (
    <footer className="bg-bg embedded:hidden!">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-t-2 border-line-strong pt-10 pb-12 md:grid-cols-12 md:gap-x-8">
          <div className="col-span-2 grid content-start gap-4 md:col-span-6">
            <Link href="/" aria-label="Between Gigs home" className="inline-flex w-fit rounded-md"><Logo height={36} /></Link>
            <p className="max-w-sm font-display text-heading-lg text-balance text-ink">Extraordinary talent. <span className="text-ink-brand">Everyday solutions.</span></p>
            <p className="max-w-sm text-body-sm text-ink-muted">Entertainment-industry talent for people, businesses, and organizations.</p>
            <a className={linkClass} href="mailto:hello@between-gigs.com">hello@between-gigs.com</a>
          </div>
          <nav aria-label="Explore Between Gigs" className="grid content-start gap-1 md:col-span-3 md:border-l md:border-line md:pl-8">
            <h2 className={label}>Explore</h2>
            <Link className={linkClass} href="/professionals/">For professionals</Link>
            <Link className={linkClass} href="/storyboard/">Storyboard</Link>
          </nav>
          <nav aria-label="Legal and standards" className="grid content-start gap-1 md:col-span-3 md:border-l md:border-line md:pl-8">
            <h2 className={label}>Legal</h2>
            <Link className={linkClass} href="/privacy/">Privacy</Link>
            <Link className={linkClass} href="/terms/">Terms</Link>
            <Link className={linkClass} href="/provider-standards/">Provider standards</Link>
            <Link className={linkClass} href="/licensing-insurance/">Licensing &amp; insurance</Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line py-5 text-body-sm text-ink-muted">
          <span>© 2026 Between Gigs</span>
          {showsPreviewNote(data.kind) && <span>Preview build: people in the sample data are fictional. <Link href="/preview/" className="underline underline-offset-2 hover:text-ink">Preview guide</Link></span>}
          {showsPreviewNote(data.kind) && <VersionSwitcher className="sm:ml-auto" />}
        </div>
      </div>
    </footer>
  );
}
