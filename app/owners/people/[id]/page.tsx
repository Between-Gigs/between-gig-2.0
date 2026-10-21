import type { Metadata } from "next";
import { OwnerPerson } from "@/components/owners/OwnerPerson";
import { seedPeople } from "@/lib/data/seed";

// Seed ids are prerendered; anyone added later resolves through app/not-found.tsx (see app/p/[slug]).
export const dynamicParams = false;
export const generateStaticParams = () => seedPeople.map((p) => ({ id: p.id }));
export const metadata: Metadata = { title: "Person" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OwnerPerson id={id} />;
}
