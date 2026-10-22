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

/** Eyebrow + two-line display heading with the second line in ink-brand (BRAND.md "headline accents"). */
export function SectionHeading({ id, eyebrow, title, accent, center, className, children }: {
  id?: string; eyebrow?: string; title: string; accent?: string; center?: boolean; className?: string; children?: React.ReactNode;
}) {
  return (
    <div className={cx("grid content-start gap-3", center && "justify-items-center text-center", className)}>
      {eyebrow && <Reveal effect="fade-up"><p className="text-eyebrow text-ink-brand uppercase">{eyebrow}</p></Reveal>}
      <Reveal effect="fade-up" delay={60}>
        <h2 id={id} className="max-w-3xl font-display text-display-sm text-balance text-ink sm:text-display-md">
          {title}{accent && <><br /><span className="text-ink-brand">{accent}</span></>}
        </h2>
      </Reveal>
      {children}
    </div>
  );
}

/** The one call to action of the funnel. "Get on the call sheet ↗", always the same words and arrow. */
export function CallSheetButton({ onClick, label = "Get on the call sheet", size = "lg", className }: { onClick: () => void; label?: string; size?: "md" | "lg"; className?: string }) {
  return <Button variant="primary" size={size} className={cx("glow-hover", className)} iconEnd={<ArrowUpRight />} onClick={onClick}>{label}</Button>;
}

/** Founders, copy from the live site (components/current-founders.tsx). */
export function Founders({ peterBio }: { peterBio: string }) {
  const people = [
    { name: "Peter Lenkov", photo: "art/founders/peter-lenkov.jpg", bio: peterBio, link: "https://www.imdb.com/name/nm0006997/", linkLabel: "View credits" },
    { name: "Patti Lenkov", photo: "art/founders/patti-lenkov.jpg", bio: "Founder of Agility Executive Search, Patti has spent three decades identifying and recruiting exceptional leaders. Her career has focused on understanding what people do best, recognizing transferable skills, and connecting talent with the right opportunities. At Between Gigs, she brings that expertise to help experienced professionals turn what they know and do well into new ways of working.", link: "https://www.linkedin.com/in/patricialenkov/", linkLabel: "Professional background" },
  ];
  return (
    <section id="founders" aria-labelledby="founders-heading" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
      <SectionHeading id="founders-heading" eyebrow="Meet the Founders" title="Real people." accent="A shared belief in your craft." center />
      <ul className="mt-10 grid gap-6 md:grid-cols-2">
        {people.map((p, i) => (
          <li key={p.name}>
            <Reveal effect="fade-up" delay={i * 80} className="grid h-full gap-5 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-12">
              <img src={asset(p.photo)} alt={`${p.name}, co-founder of Between Gigs`} loading="lazy" className="aspect-4/5 w-32 rounded-xl object-cover sm:col-span-4 sm:w-full" />
              <div className="grid content-start gap-2 sm:col-span-8">
                <h3 className="font-display text-heading-lg text-ink">{p.name}</h3>
                <p className="text-label-md text-ink-brand">Co-founder</p>
                <p className="text-body-md text-ink-muted">{p.bio}</p>
                <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-fit items-center gap-1 text-label-md text-link underline underline-offset-4 sm:min-h-6">
                  {p.linkLabel}<ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
