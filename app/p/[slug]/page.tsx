import type { Metadata } from "next";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { seedPeople } from "@/lib/data/seed";
import { share, type OgName } from "@/lib/og";
import ogPages from "@/lib/og-pages.json";

/*
 * Static export: seed slugs are prerendered. A slug created later (someone who registers in the demo)
 * has no file, so GitHub Pages serves 404.html, and app/not-found.tsx renders this same view from the
 * URL. The server build renders any handle on request: dynamicParams is left at its default (true), which
 * the export can't use and treats as false.
 */
export const generateStaticParams = () => seedPeople.map((p) => ({ slug: p.id }));
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  // Approved sample people have their own share image; anyone else gets the call sheet's.
  const name = `p-${slug}`;
  return name in ogPages ? { ...share(name as OgName), title: ogPages[name as OgName].title } : { ...share("home"), title: "Gigster profile" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicProfile slug={slug} />;
}
