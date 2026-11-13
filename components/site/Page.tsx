import { cx } from "@ds/components/cx";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { StageProps } from "./StageProps";

/**
 * Header, main landmark and footer. `width` sets the content measure. `decor` lays the still-life props (StageProps)
 * at the page's edges ("bottom": only the bottom-left one, where a top bar of actions would sit on the top piece), behind the content, in Green Room.
 */
export function Page({ children, className, bare = false, decor = false }: { children: React.ReactNode; className?: string; bare?: boolean; decor?: boolean | "corners" | "bottom" }) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-bg text-ink">
      <SiteHeader />
      {/* The props hang from the full width between header and footer, not from the content measure. */}
      <div className={cx("flex flex-1 flex-col", decor && "relative isolate")}>
        {decor && <StageProps corners={decor === "corners"} top={decor !== "bottom"} />}
        <main id="main" tabIndex={-1} className={cx("flex-1 outline-none", !bare && "mx-auto w-full max-w-7xl px-4 pt-8 pb-20 sm:px-6", className)}>
          {children}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}

// The brand band that opens a page lives in its own client file (it follows the look).
export { BrandBand } from "./BrandBand";
