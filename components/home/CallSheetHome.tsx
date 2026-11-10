"use client";
import { Logo, ThemeToggle, cx } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { CallSheetDialog } from "@/components/funnel/CallSheetDialog";
import { CallSheetButton } from "@/components/funnel/parts";
import { startCurtain, type CurtainController, type CurtainParams } from "@/lib/curtain";
import { startGravityField } from "@/lib/gravity-field";

const links = [
  { label: "For professionals", href: "/professionals/" },
  { label: "Storyboard", href: "/storyboard/" },
  { label: "Privacy", href: "/privacy/" },
  { label: "Terms", href: "/terms/" },
];

/**
 * Milestone 5a: today's home page, the "call sheet", rebuilt from the design system's ComingSoon template.
 * Same words as the live page: "Extraordinary talent. Everyday solutions." / "Coming soon." /
 * "Los Angeles Call Sheet" / "Get on the call sheet ↗", which opens the same sign-up dialog as /professionals (same form,
 * pipeline and fields; placement "home"), with "Why join? For professionals →" beside it. Follows the Day/Night toggle.
 * The dot field is a gravity well: the pointer is a mass that bends the grid toward it (lib/gravity-field.ts).
 * Still on touch and under reduced motion.
 * Direction G (Swiss grid): the headline huge and flush left on the 12-column grid, the call sheet as the screen's
 * one solid mint block, and the dot field / curtain hard-cropped into a square forest brand block beside it (forest in
 * both themes: the block is pinned to the dark theme, as the brand panels on /professionals are).
 */
export function CallSheetHome({ curtain }: {
  /**
   * Draw the stage curtain (lib/curtain.ts) instead of the gravity well. The tuning page passes its live settings,
   * gets the controller; the button parts it as decoration while the dialog opens (and closes it again while tuning).
   */
  curtain?: { params: () => CurtainParams; onReady?: (c: CurtainController) => void; stayOnPage?: boolean };
} = {}) {
  const field = React.useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = React.useState(false);
  const ctl = React.useRef<CurtainController | null>(null);
  const curtainOn = !!curtain;
  const curtainRef = React.useRef(curtain);
  React.useEffect(() => { curtainRef.current = curtain; });
  React.useEffect(() => {
    const el = field.current;
    if (!el) return;
    if (!curtainOn) return startGravityField(el);
    const c = startCurtain(el, () => curtainRef.current!.params());
    ctl.current = c; curtainRef.current?.onReady?.(c);
    return () => { c.stop(); ctl.current = null; };
  }, [curtainOn]);
  // The button opens the sign-up straight away. With the curtain, it also parts as decoration (never a gate before
  // the form); while tuning it then closes again so the opening can be replayed.
  const join = () => {
    setDialog(true);
    const c = ctl.current;
    if (c) c.open(() => { if (curtainRef.current?.stayOnPage) window.setTimeout(() => c.reset(), 700); });
  };
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6">
        <header className="grid h-16 grid-cols-12 items-center gap-x-6 border-b-4 border-line-strong lg:h-20">
          <Link href="/" aria-label="Between Gigs home" className="col-span-6 inline-flex min-h-11 w-fit items-center md:col-span-3"><Logo height={30} /></Link>
          <div className="col-span-6 flex items-center justify-end gap-3 md:col-span-3 md:col-start-10">
            <Link href="/login/" className="inline-flex min-h-11 items-center px-2 text-label-md font-bold text-ink underline-offset-4 transition-colors duration-fast hover:underline">Sign in</Link>
            <ThemeToggle size="sm" showLabel={false} className="pr-0.5!" />
          </div>
        </header>

        <main id="main" className="grid flex-1 grid-cols-12 content-start gap-x-6 gap-y-8 py-8 lg:content-center lg:py-12">
          <div className="col-span-12 flex min-w-0 flex-col lg:col-span-7">
            <Reveal effect="fade-up"><p className={cx(eyebrow, "text-ink")}>Extraordinary talent. Everyday solutions.</p></Reveal>
            <Reveal effect="fade-up" delay={80}>
              <h1 className="mt-4 font-display text-display-md text-ink sm:text-display-lg xl:text-display-xl">
                Coming<br /><span className="text-ink-brand">soon.</span>
              </h1>
            </Reveal>
            {/* The screen's one mint block: the call sheet sign-up. */}
            <Reveal effect="fade-up" delay={160} className="mt-8 lg:mt-auto lg:pt-10">
              <section aria-labelledby="call-sheet-h" className="grid gap-5 bg-tint-mint p-5 text-forest-950 sm:grid-cols-7 sm:items-end sm:gap-x-6 sm:p-6">
                <h2 id="call-sheet-h" className="font-display text-heading-lg sm:col-span-3">Los Angeles Call Sheet</h2>
                <div className="grid gap-3 sm:col-span-4">
                  <CallSheetButton onClick={join} className={cx("h-14! w-full justify-between! gap-6 px-5! text-heading-sm [&_svg]:size-5!", onMint)} />
                  <Link href="/professionals/" className="inline-flex min-h-11 w-fit items-center gap-2 text-label-md font-bold text-forest-950 underline decoration-2 underline-offset-4">
                    Why join? For professionals<ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
              </section>
            </Reveal>
          </div>

          {/* The brand block: the dot field (gravity well) or the stage curtain, hard-cropped square into the grid. */}
          <div className="col-span-12 lg:col-span-5">
            <div ref={field} data-theme="dark" className="depth-field relative isolate aspect-square w-full overflow-hidden text-ink max-lg:max-h-96 max-lg:aspect-auto max-lg:h-72 sm:max-lg:h-96">
              {!curtainOn && <span aria-hidden="true" className="glow-horizon" />}
            </div>
          </div>
        </main>

        <footer className="grid grid-cols-12 items-center gap-x-6 gap-y-2 border-t-4 border-line-strong py-4 text-body-sm">
          <span className="col-span-12 font-bold text-ink md:col-span-4">© 2026 Between Gigs</span>
          <nav aria-label="Footer" className="col-span-12 flex flex-wrap gap-x-5 md:col-span-8 md:justify-end">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={footLink}>{l.label}</Link>
            ))}
            <a href="mailto:hello@between-gigs.com" className={footLink}>hello@between-gigs.com</a>
          </nav>
        </footer>
      </div>
      <CallSheetDialog open={dialog} category="" placement="home" onClose={() => setDialog(false)} />
    </div>
  );
}

const eyebrow = "text-label-sm font-bold tracking-widest text-ink-muted uppercase";
const footLink = "inline-flex min-h-11 items-center text-ink-muted underline-offset-4 transition-colors duration-fast hover:text-ink hover:underline";
/** Forest on the mint block, in both themes (as on the profile's booking panel). */
const onMint = "bg-forest-950! text-white! hover:bg-forest-800!";
