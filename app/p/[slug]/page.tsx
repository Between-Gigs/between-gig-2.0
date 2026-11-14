import type { Metadata } from "next";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { professionalExamples } from "@/lib/professional-examples";
import { seedPeople } from "@/lib/data/seed";
import { share, type OgName } from "@/lib/og";
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
  // Each sample has its own share card (og-pages.json); anyone else gets the Gigsters card, under their own name and URL.
  const name = `p-${slug}`;
  if (name in ogPages) return { ...share(name as OgName), title: ogPages[name as OgName].title };
  const person = seedPeople.find((p) => p.id === slug);
  const title = person?.name ?? "Gigster profile";
  return { ...share("gigsters", { title, description: `${title} on Between Gigs: entertainment-industry talent for everyday projects.`, path: `/p/${slug}/` }), title };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicProfile slug={slug} />;
}
