"use client";
import { cx } from "@ds/components/cx";
import { useLook } from "./LookSync";

/**
 * The band that opens a page. Green Room (editorial) uses Justin's Flow style: the cream page, a serif headline and a
 * strong rule under it, with no dark forest block or dot texture (the client asked to retire that background, 13 Nov
 * 2026). The other looks keep the forest band, a dark-theme island in both themes.
 */
export function BrandBand({ eyebrow, title, accent, children, className }: { eyebrow?: string; title: React.ReactNode; accent?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  const look = useLook();
  if (look === "editorial") return (
    <section className={cx("relative", className)}>
      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <div className="border-b border-line-strong pb-10">
          {eyebrow && <p className="text-eyebrow text-ink-muted uppercase">{eyebrow}</p>}
          <h1 className="mt-3 max-w-3xl font-display text-display-md text-balance text-ink sm:text-display-lg">
            {title}{accent && <> <span className="text-ink-brand">{accent}</span></>}
          </h1>
          {children}
        </div>
      </div>
    </section>
  );
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
