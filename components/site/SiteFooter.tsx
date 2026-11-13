import { Logo } from "@ds/components/Logo";
import Link from "next/link";
import { data } from "@/lib/data";
import { showsPreviewNote } from "@/lib/preview-note";
import { VersionSwitcher } from "./VersionSwitcher";
import { ThemedImg } from "@/components/ui/ThemedImg";

/** Photo bands to choose from for the footer (preview: /preview/footers/). Generated concept art: public/art/footer. */
export const footerPhotos = {
  craft: { label: "Craft table", note: "Tools on ivory paper: scissors, tape, swatches, a compass." },
  stage: { label: "Empty soundstage", note: "Golden-hour set: lights, a director's chair, cases." },
  hills: { label: "Los Angeles dusk", note: "Palms and the hills as the city lights come on." },
  curtain: { label: "Velvet curtain", note: "Forest-green velvet with a warm stage light." },
} as const;
export type FooterPhoto = keyof typeof footerPhotos;

const linkClass = "inline-flex min-h-11 w-fit items-center text-body-md text-ink underline-offset-4 hover:text-ink-brand hover:underline sm:min-h-9";
const label = "mb-2 text-eyebrow text-ink-muted uppercase";

/**
 * The footer in the Green Room style (Justin's Flow): a soft tinted band under the page, the logo with the
 * brand line in serif and the contact address on the left, two short link columns on the right, and one thin-ruled
 * line of small print. No trademark line (removed at the client's request, 13 Nov 2026).
 */
/** No photo on the site footer (client, 13 Nov 2026: "it shouldn't come with the footer"). The photo bands stay
 * available for the /preview/footers/ comparison. */
export function SiteFooter({ photo = null }: { photo?: FooterPhoto | null } = {}) {
  return (
    // A soft band of its own instead of a rule across the top (client, 13 Nov 2026).
    <footer className="bg-surface-sunken embedded:hidden!">
      {photo && (
        // The photo as a band above the links, cut with a sharp edge; the footer panel casts a shadow up onto it,
        // so the picture sits further back. No gradient (client, 13 Nov 2026).
        <div aria-hidden="true" className="relative h-40 overflow-hidden sm:h-56 lg:h-64">
          <ThemedImg src={`/art/footer/${photo}.jpg`} width={1920} height={640} className="absolute inset-0 size-full object-cover" />
        </div>
      )}
      <div className="relative bg-surface-sunken shadow-lift">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 pt-12 pb-12 md:grid-cols-12 md:gap-x-8">
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
      </div>
    </footer>
  );
}
