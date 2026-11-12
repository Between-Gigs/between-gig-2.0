"use client";
import { Logo, ThemeToggle } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { CallSheetDialog } from "@/components/funnel/CallSheetDialog";
import { CallSheetButton } from "@/components/funnel/parts";
import { VersionSwitcher } from "@/components/site/VersionSwitcher";
import { LookSwitcher } from "@/components/site/LookSwitcher";
import { useLook } from "@/components/site/LookSync";
import { data } from "@/lib/data";
import { showsPreviewNote } from "@/lib/preview-note";
import { curtainDefaults, startCurtain, type CurtainController, type CurtainParams } from "@/lib/curtain";
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
/** The home page's own curtain: the tuned defaults; it parts when the sign-up opens and hangs again afterwards. */
const HOME_CURTAIN = { params: () => curtainDefaults, stayOnPage: true };

export function CallSheetHome({ curtain = HOME_CURTAIN }: {
  /**
   * The stage curtain (lib/curtain.ts), drawn in the brand block. The home page uses the tuned defaults; the tuning
   * page passes its live settings,
   * gets the controller; the button parts it as decoration while the dialog opens (and closes it again while tuning).
   */
  curtain?: { params: () => CurtainParams; onReady?: (c: CurtainController) => void; stayOnPage?: boolean };
} = {}) {
  const look = useLook();
  const frame = React.useRef<HTMLDivElement>(null);
  const field = React.useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = React.useState(false);
  const ctl = React.useRef<CurtainController | null>(null);
  const swiss = look === "swiss";
  const curtainOn = swiss || curtain !== HOME_CURTAIN;
  const curtainRef = React.useRef(curtain);
  React.useEffect(() => { curtainRef.current = curtain; });
  React.useEffect(() => {
    const el = swiss ? field.current : frame.current;
    if (!el) return;
    if (!curtainOn) return startGravityField(el);
    const c = startCurtain(el, () => curtainRef.current!.params());
    ctl.current = c; curtainRef.current?.onReady?.(c);
    return () => { c.stop(); ctl.current = null; };
  }, [curtainOn, swiss]);
  // The button opens the sign-up straight away. With the curtain, it also parts as decoration (never a gate before
  // the form); while tuning it then closes again so the opening can be replayed.
  const join = () => {
    setDialog(true);
    const c = ctl.current;
    if (c) c.open(() => { if (curtainRef.current?.stayOnPage) window.setTimeout(() => c.reset(), 700); });
  };
  return (
    <div className="flex min-h-dvh flex-col bg-bg p-2 text-ink sm:p-3 swiss:p-0">
      <div ref={frame} className="depth-field relative isolate mx-auto flex w-full flex-1 flex-col overflow-clip rounded-2xl border border-line px-4 sm:px-8 swiss:max-w-7xl swiss:border-0 swiss:bg-none swiss:bg-bg swiss:sm:px-6">
        {!swiss && !curtainOn && <span aria-hidden="true" className="glow-horizon" />}

        <header className="relative z-sticky flex min-h-16 items-center justify-between gap-2 lg:min-h-20 swiss:border-b-4 swiss:border-line-strong">
          <Link href="/" aria-label="Between Gigs home" className="inline-flex min-h-11 items-center">
            <Logo height={30} className="hidden sm:block" /><Logo layout="mark" height={30} className="sm:hidden" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <LookSwitcher />
            <ThemeToggle size="sm" showLabel={false} className="pr-0.5!" />
            <Link href="/login/" className="inline-flex min-h-11 items-center px-2 font-display text-label-md font-semibold text-ink underline-offset-8 hover:underline">Log in</Link>
          </div>
        </header>

        <main id="main" className="relative flex flex-1 flex-col items-center justify-center py-12 text-center swiss:items-stretch swiss:justify-start swiss:gap-8 swiss:py-8 swiss:text-left swiss:lg:grid swiss:lg:grid-cols-12 swiss:lg:content-center swiss:lg:gap-x-6 swiss:lg:py-12">
          <div className="flex min-w-0 flex-col swiss:lg:col-span-7">
            <Reveal effect="fade-up"><p className="text-eyebrow text-ink-brand uppercase swiss:text-ink">Extraordinary talent. Everyday solutions.</p></Reveal>
            <Reveal effect="fade-up" delay={80}>
              <h1 className="mt-4 max-w-3xl font-display text-display-lg text-balance text-ink sm:text-display-xl swiss:max-w-none swiss:text-display-md swiss:sm:text-display-lg swiss:xl:text-display-xl">
                Coming <br className="hidden swiss:block" /><span className={swiss ? "text-ink-brand" : "glow-text text-ink-brand"}>soon.</span>
              </h1>
            </Reveal>
            <Reveal effect="fade-up" delay={160} className="mt-8 swiss:lg:mt-auto swiss:lg:pt-10">
              <section aria-labelledby="call-sheet-h" className="grid justify-items-center gap-5 swiss:justify-items-stretch swiss:bg-tint-mint swiss:p-5 swiss:text-forest-950 swiss:sm:grid-cols-7 swiss:sm:items-end swiss:sm:gap-x-6 swiss:sm:p-6">
                <h2 id="call-sheet-h" className="text-body-lg text-ink-muted swiss:font-display swiss:text-heading-lg swiss:text-forest-950 swiss:sm:col-span-3">Los Angeles Call Sheet</h2>
                <div className="grid justify-items-center gap-3 swiss:justify-items-start swiss:sm:col-span-4">
                  <CallSheetButton onClick={join} className="h-14! gap-3 px-8! text-heading-sm [&_svg]:size-5! swiss:w-full swiss:justify-between! swiss:gap-6 swiss:bg-forest-950! swiss:px-5! swiss:text-white! swiss:hover:bg-forest-800!" />
                  <Link href="/professionals/" className="inline-flex min-h-11 w-fit items-center gap-2 text-label-md text-ink-muted underline underline-offset-4 swiss:font-bold swiss:text-forest-950">
                    Why join? For professionals<ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
              </section>
            </Reveal>
          </div>
          <div className="hidden flex-1 flex-col swiss:flex lg:col-span-5">
            <div ref={field} data-theme="dark" className="depth-field relative isolate w-full overflow-hidden text-ink max-lg:min-h-72 max-lg:flex-1 lg:aspect-square" />
          </div>
        </main>

        <footer className="relative grid grid-cols-12 items-start gap-x-6 gap-y-2 py-4 text-body-sm swiss:border-t-4 swiss:border-line-strong">
          <span className="col-span-12 inline-flex min-h-11 items-center text-ink md:col-span-4">© 2026 Between Gigs</span>
          <nav aria-label="Footer" className="col-span-12 flex flex-wrap gap-x-5 md:col-span-8 md:justify-end">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={footLink}>{l.label}</Link>
            ))}
            <a href="mailto:hello@between-gigs.com" className={footLink}>hello@between-gigs.com</a>
          </nav>
          {showsPreviewNote(data.kind) && <div className="col-span-12 flex md:justify-end"><VersionSwitcher /></div>}
        </footer>
      </div>
      <CallSheetDialog open={dialog} category="" placement="home" onClose={() => setDialog(false)} />
    </div>
  );
}

const footLink = "inline-flex min-h-11 items-center text-ink-muted underline-offset-4 transition-colors duration-fast hover:text-ink hover:underline";
