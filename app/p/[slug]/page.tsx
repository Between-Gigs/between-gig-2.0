import type { Metadata } from "next";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { professionalExamples } from "@/lib/professional-examples";
import { seedPeople } from "@/lib/data/seed";
import { asset } from "@/lib/site";
import { share, siteOrigin, type OgName } from "@/lib/og";
import ogPages from "@/lib/og-pages.json";

/*
 * Static export: seed slugs are prerendered. A slug created later (someone who registers in the demo)
 * has no file, so GitHub Pages serves 404.html, and app/not-found.tsx renders this same view from the
 * URL. The server build renders any handle on request: dynamicParams is left at its default (true), which
 * the export can't use and treats as false.
 */
export const generateStaticParams = () => [...seedPeople, ...professionalExamples].map((p) => ({ slug: p.id }));
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const example = process.env.NEXT_PUBLIC_DATA_SOURCE !== "api" && professionalExamples.find((card) => card.id === slug);
  if (example) {
    const title = `${example.name} · ${example.title}`;
    const description = `Fictional sample Gigster profile. ${example.services}. ${example.pricing}`;
    const image = { url: `${siteOrigin}${asset(`art/samples/cards/${example.img}-portrait.jpg`)}`, width: 480, height: 640, alt: `Illustrative portrait of ${example.name}` };
    return {
      title, description,
      openGraph: { type: "website", title, description, url: `${siteOrigin}${asset(`p/${slug}/`)}`, images: [image] },
      twitter: { card: "summary", title, description, images: [image.url] },
    };
  }
  // Approved sample people have their own share image; anyone else gets the call sheet's.
  const name = `p-${slug}`;
  return name in ogPages ? { ...share(name as OgName), title: ogPages[name as OgName].title } : { ...share("home"), title: "Gigster profile" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicProfile slug={slug} />;
}
