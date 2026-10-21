"use client";
import { Badge, EmptyState, SegmentedControl, cx } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowUpRight, BookOpen } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { flushSync } from "react-dom";
import { articleAuthor, authorSlug, categories, formatDate, readingMinutes, type Article } from "@/lib/journal";
import { asset } from "@/lib/site";
import { Page } from "@/components/site/Page";

function reflow(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (!doc.startViewTransition || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { update(); return; }
  doc.startViewTransition(() => flushSync(update));
}

/** /journal and /journal/authors/[slug]: the newest story large, the rest as a grid, filterable by kind. */
export function JournalIndex({ articles, author }: { articles: Article[]; author?: string }) {
  const [filter, setFilter] = React.useState("all");
  const shown = articles.filter((a) => filter === "all" || a.category === filter);
  const [lead, ...rest] = shown;

  return (
    <Page>
      <header className="grid gap-3 border-b border-line pb-8">
        <p className="text-eyebrow text-ink-brand uppercase">{author ? "Author" : "Between Gigs"}</p>
        <h1 className="font-display text-display-md text-ink sm:text-display-lg">{author ?? "The Journal"}</h1>
        <p className="max-w-prose text-body-lg text-ink-muted">
          {author ? `${articles.length} ${articles.length === 1 ? "entry" : "entries"} in The Journal.` : "Stories, production guides and industry perspectives from Between Gigs."}
        </p>
        {author && <Link href="/journal/" className="inline-flex min-h-6 w-fit items-center text-body-sm text-link underline underline-offset-2">All of The Journal</Link>}
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl label="Kind of story" size="sm" value={filter} onChange={(v) => reflow(() => setFilter(v))}
          options={[{ value: "all", label: "All" }, ...categories.map((c) => ({ value: c, label: c }))]} />
        <span className="font-mono text-data-sm text-ink-subtle" aria-live="polite">{shown.length} {shown.length === 1 ? "story" : "stories"}</span>
      </div>

      {!lead ? (
        <EmptyState className="mt-10" icon={<BookOpen />} title="Nothing here yet" headingLevel={2}>New stories arrive regularly.</EmptyState>
      ) : (
        <>
          <article style={{ viewTransitionName: `article-${lead.id}` }} className="group relative mt-8 grid overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:grid-cols-12">
            <img src={asset(lead.cover)} alt={lead.coverAlt} className="aspect-3/2 w-full object-cover lg:col-span-7 lg:aspect-auto lg:h-full" />
            <div className="grid content-center gap-3 p-6 lg:col-span-5 lg:p-10">
              <Badge tone="brand" size="sm" className="w-fit">{lead.category}</Badge>
              <h2 className="font-display text-display-sm text-balance text-ink">
                <Link href={`/journal/${lead.id}/`} className="after:absolute after:inset-0 group-hover:text-ink-brand">{lead.title}</Link>
              </h2>
              <p className="font-serif text-editorial-lg text-ink-muted">{lead.dek}</p>
              <Meta article={lead} />
            </div>
          </article>
          <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((a, i) => (
              <li key={a.id} style={{ viewTransitionName: `article-${a.id}` }}>
                <Reveal effect="fade-up" delay={(i % 3) * 60} className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition duration-base hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="aspect-3/2 overflow-hidden"><img src={asset(a.cover)} alt={a.coverAlt} loading="lazy" className="size-full object-cover transition-transform duration-slow group-hover:scale-105" /></div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <p className="text-label-sm text-ink-brand">{a.category}</p>
                    <h2 className="font-display text-heading-lg text-ink">
                      <Link href={`/journal/${a.id}/`} className="after:absolute after:inset-0 group-hover:text-ink-brand">{a.title}</Link>
                    </h2>
                    <p className="text-body-md text-ink-muted">{a.dek}</p>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-3"><Meta article={a} /><ArrowUpRight className="size-5 shrink-0 text-ink-brand" aria-hidden="true" /></div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </>
      )}
    </Page>
  );
}

export function Meta({ article, className, linkAuthor = false }: { article: Article; className?: string; linkAuthor?: boolean }) {
  const name = articleAuthor(article);
  return (
    <p className={cx("flex flex-wrap gap-x-2 text-body-sm text-ink-subtle", className)}>
      {linkAuthor ? <Link href={`/journal/authors/${authorSlug(name)}/`} className="relative z-raised text-link underline underline-offset-2">{name}</Link> : <span>{name}</span>}
      <span aria-hidden="true">·</span><time dateTime={article.date}>{formatDate(article.date)}</time>
      <span aria-hidden="true">·</span><span>{readingMinutes(article)} min read</span>
    </p>
  );
}
