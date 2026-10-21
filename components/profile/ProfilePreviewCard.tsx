import { Badge } from "@ds/components";
import { MapPin } from "lucide-react";
import type { ProfileFields } from "@/lib/data";
import { basisShort } from "@/lib/data/taxonomy";
import { PersonPhoto } from "@/components/people/PersonPhoto";

export const areaLine = (f: ProfileFields) =>
  f.market === "la" ? (f.areas.length ? `${f.areas.slice(0, 2).join(" · ")}, Los Angeles` : "Los Angeles") : f.otherCity || "Another market";

/** The live preview beside the builder: how the search card will read, updated as they type. From the GigsterOnboarding template. */
export function ProfilePreviewCard({ fields: d, personId }: { fields: ProfileFields; personId: string }) {
  const tags = d.services.slice(0, 2);
  return (
    <article aria-label="Live preview of your profile card" className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
      <div data-theme="dark" className="relative isolate h-32 overflow-hidden bg-surface-brand">
        <span aria-hidden="true" className="glow-horizon opacity-70" />
        <Badge tone="brand" size="sm" className="absolute top-3 left-3 shadow-sm">Live preview</Badge>
      </div>
      <div className="relative grid gap-3 px-5 pb-5">
        <div className="-mt-10 size-20 overflow-hidden rounded-2xl border-4 border-surface bg-surface-sunken shadow-lg">
          <PersonPhoto id={personId} name={d.name} src={d.photo || undefined} alt={d.photo ? "Your profile photo" : "No photo yet"} className="size-full" textClass="text-heading-lg" />
        </div>
        <div>
          <h3 className="font-display text-heading-lg text-ink">{d.name || "Your name"}</h3>
          <p className="text-label-md text-ink-brand">{d.position || "Your position"}{d.years && ` · ${d.years} ${d.years === "1" ? "year" : "years"}`}</p>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => <Badge key={t} tone="brand" size="sm">{t}</Badge>)}
            {d.services.length > 2 && <Badge tone="neutral" size="sm">+{d.services.length - 2}</Badge>}
          </div>
        )}
        <p className="line-clamp-4 text-body-sm text-ink-muted">{d.about || "Your story appears here."}</p>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3 text-body-sm">
          <span className="flex min-w-0 items-center gap-1 text-ink-subtle"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{areaLine(d)}</span></span>
          {d.rate && <b className="shrink-0 font-display text-heading-md text-ink">${d.rate}<span className="text-body-sm font-normal text-ink-muted">/{basisShort[d.basis]}</span></b>}
        </div>
      </div>
    </article>
  );
}
