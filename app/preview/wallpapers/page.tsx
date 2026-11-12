import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, Maximize2 } from "lucide-react";
import { Page } from "@/components/site/Page";
import { asset } from "@/lib/site";

export const metadata: Metadata = {
  title: "Wallpapers & background art",
  description: "Download the Between Gigs invitation artwork, Crew Call film set and Los Angeles Call Sheet backgrounds.",
  robots: { index: false, follow: false },
};

type Artwork = {
  file: string;
  title: string;
  original?: string;
  alt: string;
  width: number;
  height: number;
};

const invitation: Artwork[] = [
  {
    file: "craft-invitation-desktop.jpg", title: "Desktop",
    alt: "Landscape arrangement of green velvet, gold scissors, a camera lens, wedding photographs, work gloves and a hammer around empty ivory paper.",
    width: 1920, height: 1080,
  },
  {
    file: "craft-invitation-portrait.jpg", title: "Invitation portrait",
    alt: "Portrait arrangement of the invitation’s craft tools and wedding photograph around a clear ivory center.",
    width: 979, height: 1280,
  },
];

const crewCall: Artwork[] = [
  {
    file: "crew-call-desktop.jpg", title: "Desktop",
    alt: "A sunlit film set framed by the Between Gigs director’s chair, a studio light and equipment cases.",
    width: 1920, height: 1080,
  },
  {
    file: "crew-call-portrait.jpg", title: "Portrait",
    alt: "A portrait adaptation of the Crew Call set, with the branded director’s chair and equipment case framing a sunlit wall.",
    width: 1080, height: 1920,
  },
];

const callSheet: Artwork[] = [
  {
    file: "call-sheet-night.jpg", title: "Night horizon",
    alt: "A fine field of dots crosses a dark forest-green background above a curved, glowing mint horizon.",
    width: 3840, height: 2160,
  },
  {
    file: "call-sheet-day.jpg", title: "Day horizon",
    alt: "A pale green field of dots with a soft mint horizon illuminating its lower edge.",
    width: 3840, height: 2160,
  },
  {
    file: "stage-curtain.jpg", title: "Stage curtain",
    alt: "Pleats of mint-green dots hang above the Call Sheet stage in a dark theater.",
    width: 3840, height: 2160,
  },
];

const templateFrame: Artwork[] = [
  {
    file: "template-craft-desktop.jpg", title: "Desktop",
    alt: "Forest-green velvet, brass scissors, a vintage camera, film, fabric swatches and a dress sketch frame a wide ivory field.",
    width: 1920, height: 1080,
  },
  {
    file: "template-craft-portrait.jpg", original: "email/craft-border.jpg", title: "Template portrait",
    alt: "The portrait frame used behind the HTML invitation, with a camera body, ribbon, landscape prints and a dress sketch.",
    width: 900, height: 1125,
  },
];

function ArtPrint({ art, collection }: { art: Artwork; collection: string }) {
  const directory = "art/wallpapers/";
  const url = asset(art.original ?? directory + art.file);
  const name = collection + " · " + art.title;
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name} at full size in a new tab`}
        className="group relative block overflow-hidden rounded-xl border border-line bg-surface-sunken focus-visible:outline-2 focus-visible:outline-focus swiss:rounded-none">
        <img src={asset(directory + art.file.replace(/\.[^.]+$/, "-preview.webp"))} alt={art.alt}
          width={art.width} height={art.height} loading={art === invitation[0] ? "eager" : "lazy"} decoding="async"
          className="block h-auto w-full" />
        <span aria-hidden="true" className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full border border-line bg-surface text-ink shadow-sm transition-transform group-hover:scale-105">
          <Maximize2 className="size-4" />
        </span>
      </a>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div>
          <h3 className="font-display text-heading-sm text-ink">{art.title}</h3>
          <p className="text-body-sm tabular-nums text-ink-muted">{art.width} × {art.height} · JPG</p>
        </div>
        <a href={url} download={`between-gigs-${art.file}`} aria-label={`Download ${name}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-label-md text-ink-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-focus">
          <Download aria-hidden="true" className="size-4" />Download
        </a>
      </figcaption>
    </figure>
  );
}

function FormatPair({ items, collection }: { items: Artwork[]; collection: string }) {
  return (
    <div className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-10">
      <div className="min-w-0 sm:col-span-7"><ArtPrint art={items[0]} collection={collection} /></div>
      <div className="min-w-0 sm:col-span-3"><ArtPrint art={items[1]} collection={collection} /></div>
    </div>
  );
}

export default function WallpapersPage() {
  return (
    <Page bare>
      <div className="mx-auto max-w-7xl px-4 pt-5 pb-20 sm:px-6">
        <Link href="/preview/" className="inline-flex min-h-11 items-center gap-2 rounded-sm text-label-md text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />Preview guide
        </Link>
        <header data-call-sheet-stage="intro" className="mt-5 mb-10 border-b border-line pb-8 sm:mt-8 sm:mb-12 swiss:border-b-4 swiss:border-line-strong">
          <h1 className="max-w-5xl font-display text-display-sm text-balance text-ink sm:text-display-md">Wallpapers &amp; background art</h1>
        </header>
        <section aria-labelledby="invitation-art">
          <h2 id="invitation-art" className="font-display text-heading-lg text-ink">The craft invitation</h2>
          <p className="mt-2 max-w-2xl text-body-md text-ink-muted">The invitation’s original portrait composition and a widescreen companion, both with a clear center.</p>
          <FormatPair items={invitation} collection="The craft invitation" />
        </section>
        <section aria-labelledby="crew-call-art" className="mt-14 border-t border-line pt-8 sm:mt-16 swiss:border-t-4 swiss:border-line-strong">
          <h2 id="crew-call-art" className="font-display text-heading-lg text-ink">Crew Call film set</h2>
          <p className="mt-2 max-w-2xl text-body-md text-ink-muted">The sunlit film set from Crew Call, in a widescreen crop and a portrait adaptation.</p>
          <FormatPair items={crewCall} collection="Crew Call film set" />
        </section>
        <section aria-labelledby="call-sheet-art" className="mt-14 border-t border-line pt-8 sm:mt-16 swiss:border-t-4 swiss:border-line-strong">
          <h2 id="call-sheet-art" className="font-display text-heading-lg text-ink">Los Angeles Call Sheet</h2>
          <p className="mt-2 max-w-2xl text-body-md text-ink-muted">4K stills from the homepage’s Day and Night horizons and its dot-matrix stage curtain.</p>
          <div className="mt-6 grid gap-x-6 gap-y-8 md:grid-cols-3">
            {callSheet.map((art) => <ArtPrint key={art.file} art={art} collection="Call Sheet" />)}
          </div>
        </section>
        <section aria-labelledby="template-art" className="mt-14 border-t border-line pt-8 sm:mt-16 swiss:border-t-4 swiss:border-line-strong">
          <h2 id="template-art" className="font-display text-heading-lg text-ink">Email template frame</h2>
          <p className="mt-2 max-w-2xl text-body-md text-ink-muted">The template’s alternate flat lay, with a vintage camera, a tape measure, and landscape prints.</p>
          <FormatPair items={templateFrame} collection="Email template frame" />
        </section>
      </div>
    </Page>
  );
}
