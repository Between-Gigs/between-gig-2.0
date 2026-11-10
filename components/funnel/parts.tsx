import { Button, cx } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowUpRight } from "lucide-react";
import { asset } from "@/lib/site";

/**
 * The glowing horizon of a dark brand panel. From lg up it sits where the system puts it (80% down the panel);
 * below lg it is anchored about 80px above the panel's bottom edge instead, so on a tall phone panel the arc stays under
 * the content rather than cutting through it. Give the panel's content enough bottom padding (pb-28 or so).
 */
export function Horizon({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-96 lg:h-full">
      <span className={cx("glow-horizon", className ?? "opacity-60")} />
    </span>
  );
}

/**
 * A numbered Swiss section head (direction G): a 4px rule, the section number and eyebrow in the label column,
 * the display heading flush left across the other nine columns, its accent line in ink-brand. `compact` puts a
 * heading-lg title in the label column instead (as on the profile page). Children sit under the heading.
 */
export function SectionHeading({ id, n, eyebrow, title, accent, compact, className, children }: {
  id?: string; n?: string; eyebrow?: string; title: string; accent?: string; compact?: boolean; className?: string; children?: React.ReactNode;
}) {
  if (compact) {
    return (
      <div className={cx("grid content-start gap-1 border-t-4 border-line-strong pt-3", className)}>
        {n && <span aria-hidden="true" className="text-label-sm text-ink tabular-nums">{n}</span>}
        <h2 id={id} className="font-display text-heading-lg text-ink">{title}{accent && <> <span className="text-ink-brand">{accent}</span></>}</h2>
        {children}
      </div>
    );
  }
  return (
    <div className={cx("grid grid-cols-12 gap-x-6 gap-y-3 border-t-4 border-line-strong pt-3", className)}>
      <div className="col-span-12 flex items-baseline gap-3 lg:col-span-3 lg:grid lg:content-start lg:gap-1">
        {n && <span aria-hidden="true" className="text-label-sm text-ink tabular-nums">{n}</span>}
        {eyebrow && <p className="text-eyebrow text-ink-muted uppercase">{eyebrow}</p>}
      </div>
      <div className="col-span-12 grid content-start gap-6 lg:col-span-9">
        <Reveal effect="fade-up">
          <h2 id={id} className="font-display text-display-sm text-ink sm:text-display-md">
            {title}{accent && <><br /><span className="text-ink-brand">{accent}</span></>}
          </h2>
        </Reveal>
        {children}
      </div>
    </div>
  );
}

/** The one call to action of the funnel. "Get on the call sheet ↗", always the same words and arrow. */
export function CallSheetButton({ onClick, label = "Get on the call sheet", size = "lg", className }: { onClick: () => void; label?: string; size?: "md" | "lg"; className?: string }) {
  return <Button variant="primary" size={size} className={cx("glow-hover", className)} iconEnd={<ArrowUpRight />} onClick={onClick}>{label}</Button>;
}

/** Founders, copy from the live site (components/current-founders.tsx): a numbered Swiss section, square portraits. */
export function Founders({ peterBio, n }: { peterBio: string; n?: string }) {
  const people = [
    { name: "Peter Lenkov", photo: "art/founders/peter-lenkov.jpg", bio: peterBio, link: "https://www.imdb.com/name/nm0006997/", linkLabel: "View credits" },
    { name: "Patti Lenkov", photo: "art/founders/patti-lenkov.jpg", bio: "Founder of Agility Executive Search, Patti has spent three decades identifying and recruiting exceptional leaders. Her career has focused on understanding what people do best, recognizing transferable skills, and connecting talent with the right opportunities. At Between Gigs, she brings that expertise to help experienced professionals turn what they know and do well into new ways of working.", link: "https://www.linkedin.com/in/patricialenkov/", linkLabel: "Professional background" },
  ];
  return (
    <section id="founders" aria-labelledby="founders-heading" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
      <SectionHeading id="founders-heading" n={n} eyebrow="Meet the Founders" title="Real people." accent="A shared belief in your craft.">
        <ul className="mt-6 grid gap-x-6 gap-y-12 md:grid-cols-2">
          {people.map((p, i) => (
            <li key={p.name}>
              <Reveal effect="fade-up" delay={i * 80} className="grid h-full grid-cols-12 content-start gap-x-6 gap-y-4 border-t border-line pt-4">
                <div className="col-span-5 aspect-square overflow-hidden bg-surface-sunken sm:col-span-4 md:col-span-5">
                  <img src={asset(p.photo)} alt={`${p.name}, co-founder of Between Gigs`} loading="lazy" className="size-full object-cover object-top" />
                </div>
                <div className="col-span-7 grid content-start gap-1 sm:col-span-8 md:col-span-7">
                  <h3 className="font-display text-heading-lg text-ink">{p.name}</h3>
                  <p className="text-eyebrow text-ink-brand uppercase">Co-founder</p>
                </div>
                <div className="col-span-12 grid content-start gap-3">
                  <p className="text-body-md text-ink-muted">{p.bio}</p>
                  <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-fit items-center gap-1 text-label-md text-ink underline decoration-2 underline-offset-4 hover:text-ink-brand sm:min-h-6">
                    {p.linkLabel}<ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </SectionHeading>
    </section>
  );
}
