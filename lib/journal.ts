/*
 * The Journal's published articles, ported from the live site's seeds (imagine-os/between-gigs
 * lib/journal/seeds.ts + new-articles.ts) into content/journal/articles.json, with image paths moved to
 * public/art/. Production reads published articles from D1 workspace_records (kind 'journal'); see
 * docs/handoff/milestone-3.md.
 */
import raw from "@/content/journal/articles.json";

export type BlockType = "paragraph" | "heading" | "quote" | "image" | "budget" | "report" | "toolkit";
export interface ArticleBlock { id: string; type: BlockType; text: string; level?: 2 | 3; src?: string; alt?: string }
export type ArticleCategory = "Story" | "Production guide" | "Industry report";
export interface Article {
  id: string; title: string; dek: string; category: ArticleCategory; byline: string; date: string;
  cover: string; coverAlt: string; note: string; blocks: ArticleBlock[]; sources: { label: string; url: string }[];
}

export const articles = (raw as Article[]).slice().sort((a, b) => b.date.localeCompare(a.date));
export const categories: ArticleCategory[] = ["Story", "Production guide", "Industry report"];

export const articleAuthor = (a: Article) => a.byline.split(" · ")[0].trim();
export const authorSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const authors = () => Array.from(new Set(articles.map(articleAuthor)));
export const getArticle = (id: string) => articles.find((a) => a.id === id) ?? null;

export const readingMinutes = (a: Article) => Math.max(1, Math.round(a.blocks.reduce((n, b) => n + b.text.split(/\s+/).length, 0) / 220));
export const formatDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
