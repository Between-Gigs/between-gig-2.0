import { cx } from "@ds/components";
import { Reveal } from "@ds/motion";
import { Page } from "@/components/site/Page";
import { asset } from "@/lib/site";

/** Three columns of Gigsters and their work, offset like a contact sheet. */
const mosaic = [
  ["img/people/maya.jpg", "img/people/jordan-1.jpg", "img/people/priya.jpg"],
  ["img/people/alex-2.jpg", "img/people/sam.jpg", "img/people/morgan-3.jpg"],
  ["img/people/jordan.jpg", "img/people/maya-3.jpg", "img/people/morgan.jpg"],
];

/**
 * Sign-in and join share one frame: a forest panel of Gigsters and their work (BRAND.md: "the sign-in panel") with
 * one line of brand voice, beside the form. The form side carries the page's only heading, so nothing reads twice.
 * On phones the panel is a short band with the line alone, so the form starts high.
 */
export function AuthShell({ eyebrow, title, accent, lead, children, className }: {
  eyebrow: string; title: string; accent?: string; lead?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <Page className="max-w-6xl">
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg lg:min-h-160 lg:grid-cols-12">
        <section data-theme="dark" aria-label="Between Gigs" className="relative isolate overflow-hidden bg-surface-brand phosphor-dots lg:col-span-5">
          <div aria-hidden="true" className="absolute inset-0 hidden grid-cols-3 gap-3 p-3 lg:grid">
            {mosaic.map((col, c) => (
              <ul key={c} className={cx("grid content-start gap-3", c === 1 ? "-translate-y-16" : c === 2 ? "-translate-y-6" : "")}>
                {col.map((src, i) => (
                  <li key={src}><Reveal effect="fade-up" delay={(c * 3 + i) * 60}><img src={asset(src)} alt="" className="aspect-3/4 w-full rounded-xl object-cover" /></Reveal></li>
                ))}
              </ul>
            ))}
          </div>
          <span aria-hidden="true" className="absolute inset-0 hidden bg-linear-to-t from-surface-brand via-surface-brand/80 to-surface-brand/10 lg:block" />
          <div className="relative z-raised flex h-full flex-col justify-end px-6 py-5 sm:px-10 sm:py-8 lg:py-12">
            <p className="text-eyebrow text-ink-brand uppercase">{eyebrow}</p>
            <p className="mt-2 font-display text-heading-lg text-balance text-ink sm:text-display-sm lg:mt-3">
              {title}{accent && <> <span className="glow-text text-ink-brand">{accent}</span></>}
            </p>
            {lead && <div className="mt-3 hidden text-body-md text-ink-muted lg:block">{lead}</div>}
          </div>
        </section>
        <div className={cx("flex items-center px-6 py-8 sm:px-10 sm:py-14 lg:col-span-7", className)}>
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </div>
    </Page>
  );
}
