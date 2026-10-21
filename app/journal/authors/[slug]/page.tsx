import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JournalIndex } from "@/components/journal/JournalIndex";
import { articleAuthor, articles, authorSlug, authors } from "@/lib/journal";

export const dynamicParams = false;
export const generateStaticParams = () => authors().map((name) => ({ slug: authorSlug(name) }));

const find = (slug: string) => authors().find((n) => authorSlug(n) === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const name = find((await params).slug);
  return { title: name ? `${name} · The Journal` : "The Journal" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const name = find((await params).slug);
  if (!name) notFound();
  return <JournalIndex articles={articles.filter((a) => articleAuthor(a) === name)} author={name} />;
}
