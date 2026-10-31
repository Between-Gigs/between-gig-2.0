import type { Metadata } from "next";
import { OwnerPerson } from "@/components/owners/OwnerPerson";
import { seedPeople } from "@/lib/data/seed";
import { share } from "@/lib/og";

// Seed ids are prerendered; anyone added later resolves through app/not-found.tsx in the export, and on request in
// the server build (dynamicParams left at its default; see app/p/[slug]).
export const generateStaticParams = () => seedPeople.map((p) => ({ id: p.id }));
export const metadata: Metadata = { ...share("owners-person"), title: "Person" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OwnerPerson id={id} />;
}
