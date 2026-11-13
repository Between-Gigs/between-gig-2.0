import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Page } from "@/components/site/Page";
import { SiteFooter, footerPhotos, type FooterPhoto } from "@/components/site/SiteFooter";

export const metadata: Metadata = {
  title: "Footer photos",
  description: "Photo bands to choose from for the site footer, shown on the real footer.",
  robots: { index: false, follow: false },
};

/** Each option is the real footer with that photo band, in the current theme (switch Day/Night to compare). */
export default function FooterPhotosPage() {
  const options = Object.keys(footerPhotos) as FooterPhoto[];
  return (
    <Page bare>
      <div className="mx-auto max-w-7xl px-4 pt-5 pb-10 sm:px-6">
        <Link href="/preview/" className="inline-flex min-h-11 items-center gap-2 rounded-sm text-label-md text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />Preview guide
        </Link>
        <h1 className="mt-5 font-display text-display-sm text-ink sm:text-display-md">Footer photos</h1>
        <p className="mt-2 max-w-2xl text-body-md text-ink-muted">Four photo bands for the footer, each on the real footer. The site footer has no photo until one is picked. Switch Day/Night in the header to see each in both themes. The images are generated concept art, not photographs of real places or people.</p>
      </div>
      <ol className="grid gap-16 pb-16">
        {options.map((key, i) => (
          <li key={key} className="grid gap-4">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <h2 className="font-display text-heading-lg text-ink">Option {i + 1} · {footerPhotos[key].label}</h2>
              <p className="text-body-md text-ink-muted">{footerPhotos[key].note}</p>
            </div>
            <div className="border-y border-line"><SiteFooter photo={key} /></div>
          </li>
        ))}
      </ol>
    </Page>
  );
}
