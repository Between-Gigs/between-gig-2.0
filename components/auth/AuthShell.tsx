import { cx } from "@ds/components";
import { Reveal } from "@ds/motion";
import { Page } from "@/components/site/Page";
import { asset } from "@/lib/site";

const faces = ["maya", "jordan", "alex", "priya", "sam", "morgan"];

/**
 * Sign-in and join share one frame: the forest brand panel (BRAND.md: "the sign-in panel") beside a
 * form card. On phones the panel shrinks to a short band above the card.
 */
export function AuthShell({ eyebrow, title, accent, lead, children, className }: {
  eyebrow: string; title: string; accent?: string; lead?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <Page className="max-w-6xl">
      <div className="grid overflow-hidden rounded-2xl border border-line bg-surface shadow-lg lg:grid-cols-12">
        <section data-theme="dark" className="relative isolate overflow-hidden bg-surface-brand phosphor-dots px-6 py-10 sm:px-10 lg:col-span-5 lg:py-14">
          <span aria-hidden="true" className="glow-horizon opacity-60" />
          <div className="relative z-raised flex h-full flex-col">
            <p className="text-eyebrow text-ink-brand uppercase">{eyebrow}</p>
            <h1 className="mt-3 font-display text-display-sm text-balance text-ink sm:text-display-md">
              {title}{accent && <> <span className="glow-text text-ink-brand">{accent}</span></>}
            </h1>
            {lead && <div className="mt-4 text-body-lg text-ink-muted">{lead}</div>}
            <ul aria-hidden="true" className="mt-8 hidden -space-x-3 lg:mt-auto lg:flex lg:pt-10">
              {faces.map((f, i) => (
                <li key={f}><Reveal effect="fade-up" delay={i * 50}><img src={asset(`img/people/${f}.jpg`)} alt="" className="size-11 rounded-full border-2 border-surface-brand object-cover shadow-md" /></Reveal></li>
              ))}
            </ul>
          </div>
        </section>
        <div className={cx("px-6 py-8 sm:px-10 sm:py-12 lg:col-span-7", className)}>
          <div className="mx-auto max-w-md">{children}</div>
        </div>
      </div>
    </Page>
  );
}
