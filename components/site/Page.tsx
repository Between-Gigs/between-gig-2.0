import { cx } from "@ds/components/cx";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Header, main landmark and footer. `width` sets the content measure. */
export function Page({ children, className, bare = false }: { children: React.ReactNode; className?: string; bare?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-bg text-ink">
      <SiteHeader />
      <main id="main" tabIndex={-1} className={cx("flex-1 outline-none", !bare && "mx-auto w-full max-w-7xl px-4 pt-8 pb-20 sm:px-6", className)}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/** The brand band that opens a page: forest in both themes, so it is a dark-theme island. */
export function BrandBand({ eyebrow, title, accent, children, className }: { eyebrow?: string; title: React.ReactNode; accent?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <section data-theme="dark" className={cx("relative isolate overflow-hidden bg-surface-brand phosphor-dots", className)}>
      {/* The horizon hangs from a fixed-height strip at the bottom, so its rim always sits below the content at any width. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-64"><span className="glow-horizon opacity-50" /></div>
      <div className="relative z-raised mx-auto max-w-7xl px-4 pt-12 pb-28 sm:px-6 sm:pb-32">
        {eyebrow && <p className="text-eyebrow text-ink-brand uppercase">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl font-display text-display-md text-balance text-ink sm:text-display-lg">
          {title}{accent && <> <span className="glow-text text-ink-brand">{accent}</span></>}
        </h1>
        {children}
      </div>
    </section>
  );
}
