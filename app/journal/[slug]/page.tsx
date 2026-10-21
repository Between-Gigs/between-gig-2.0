import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleReader } from "@/components/journal/ArticleReader";
import { articles, getArticle } from "@/lib/journal";

export const dynamicParams = false;
export const generateStaticParams = () => articles.map((a) => ({ slug: a.id }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = getArticle((await params).slug);
  return a ? { title: a.title, description: a.dek } : { title: "The Journal" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const a = getArticle((await params).slug);
  if (!a) notFound();
  return <ArticleReader article={a} related={articles} />;
}
