"use client";
import { Badge } from "@ds/components/Badge";
import { ArrowUpRight } from "lucide-react";
import { BrandBand, Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { asset } from "@/lib/site";
import { olderVersionsOnline, versionUrl, versions } from "@/lib/versions";

/**
 * Every design version, newest first: what it was, when, a thumbnail of its public profile and a link that opens the
 * whole site as it was (older versions are separate builds at <base>/v/<n>/ on the Pages preview).
 */
export function VersionHistory() {
  return (
    <Page bare>
      <BrandBand eyebrow="Preview" title="Version" accent="history">
        <p className="mt-4 max-w-2xl text-body-lg text-ink-muted">Open the whole site as it looked at each step, and switch back from the version pill in the corner of every older page. Sign-ins and sample data are kept separate for each version.</p>
      </BrandBand>
      <ol className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6">
        {versions.map((v) => {
          const open = v.current || olderVersionsOnline;
          return (
            <li key={v.n} className="grid gap-5 border-t-4 border-line-strong pt-5 md:grid-cols-12 md:gap-x-6">
              <div className="md:col-span-2">
                <p className="font-display text-display-md text-ink">v{v.n}</p>
                <p className="mt-1 text-body-sm text-ink-muted">{v.date}</p>
              </div>
              <div className="grid content-start gap-3 md:col-span-6">
                <h2 className="flex flex-wrap items-center gap-3 font-display text-heading-lg text-ink">{v.name}{v.current && <Badge tone="success">Current</Badge>}</h2>
                <p className="text-body-md text-ink-muted">{v.summary}</p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-ink">
                  {v.highlights.map((h) => <li key={h} className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-2 bg-ink-brand" />{h}</li>)}
                </ul>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {open
                    ? <a href={versionUrl(v, "/")} className="inline-flex min-h-11 items-center gap-2 font-display text-label-md font-semibold text-ink underline decoration-2 underline-offset-4">{v.current ? "Open the current site" : `Open v${v.n}`}<ArrowUpRight aria-hidden="true" className="size-4" /></a>
                    : <span className="text-body-sm text-ink-subtle">Older versions open on the preview site.</span>}
                  {open && !v.current && <a href={versionUrl(v, "/p/maya/")} className="inline-flex min-h-11 items-center text-label-md text-ink-muted underline underline-offset-4 hover:text-ink">Its public profile</a>}
                </div>
              </div>
              <a href={open ? versionUrl(v, "/p/maya/") : undefined} aria-hidden="true" tabIndex={-1} className="block overflow-hidden border-2 border-line-strong md:col-span-4">
                <img src={asset(`/versions/v${v.n}.jpg`)} alt="" loading="lazy" className="aspect-video w-full object-cover object-top" />
              </a>
            </li>
          );
        })}
      </ol>
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6"><ButtonLink href="/preview/" variant="secondary">Back to the preview guide</ButtonLink></div>
    </Page>
  );
}
