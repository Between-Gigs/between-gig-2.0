import type { Metadata } from "next";
import { OwnerPerson } from "@/components/owners/OwnerPerson";
import { professionalExamples } from "@/lib/professional-examples";
import { seedPeople } from "@/lib/data/seed";
import { share } from "@/lib/og";

// Seed ids are prerendered; anyone added later resolves through app/not-found.tsx in the export, and on request in
// the server build (dynamicParams left at its default; see app/p/[slug]).
export const generateStaticParams = () => [...seedPeople, ...professionalExamples].map((p) => ({ id: p.id }));
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { ...share("owners-person", { path: `/owners/people/${id}/` }), title: "Person" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OwnerPerson id={id} />;
}
