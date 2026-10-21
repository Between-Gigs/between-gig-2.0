import type { Metadata } from "next";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { seedPeople } from "@/lib/data/seed";

/*
 * Static export: seed slugs are prerendered. A slug created later (someone who registers in the demo)
 * has no file, so GitHub Pages serves 404.html, and app/not-found.tsx renders this same view from the
 * URL. Production (a Worker) can render any slug directly.
 */
export const dynamicParams = false;
export const generateStaticParams = () => seedPeople.map((p) => ({ slug: p.id }));
export const metadata: Metadata = { title: "Gigster profile" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicProfile slug={slug} />;
}
