"use client";
import { Badge, Banner, Breadcrumbs, cx } from "@ds/components";
import { Reveal, ScrollProgress } from "@ds/motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { articleAuthor, authorSlug, type Article, type ArticleBlock } from "@/lib/journal";
import { asset, basePath } from "@/lib/site";
import { Page } from "@/components/site/Page";
import { BudgetPlanner, IndustryChart, ProductionKit } from "./blocks";
import { Meta } from "./JournalIndex";

/** /journal/[slug]: one article. Contents rail with scrollspy, reading progress, the interactive blocks, sources, more stories. */
export function ArticleReader({ article: a, related }: { article: Article; related: Article[] }) {
  const outline = a.blocks.filter((b) => b.type === "heading" || b.type === "budget" || b.type === "report" || b.type === "toolkit");
  const [current, setCurrent] = React.useState<string | null>(null);
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const nodes = root.current?.querySelectorAll<HTMLElement>("[data-outline]");
    const io = new IntersectionObserver((es) => {
      const hit = es.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
      if (hit) setCurrent(hit.target.id);
    }, { rootMargin: "-10% 0px -60% 0px" });
    nodes?.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [a.id]);

  const more = related.filter((r) => r.id !== a.id).slice(0, 3);

  return (
    <Page>
      <ScrollProgress />
      <div ref={root}>
        <Breadcrumbs items={[{ label: "The Journal", href: `${basePath}/journal/` }, { label: a.title }]} />
        <header className="mt-6 grid gap-4 lg:grid-cols-12">
          <div className="grid content-end gap-4 lg:col-span-8">
            <Badge tone="brand" size="sm" className="w-fit">{a.category}</Badge>
            <h1 className="font-display text-display-md text-balance text-ink sm:text-display-lg">{a.title}</h1>
            <p className="max-w-prose font-serif text-editorial-lg text-ink-muted">{a.dek}</p>
            <Meta article={a} linkAuthor />
          </div>
        </header>
        <figure className="mt-8 overflow-hidden rounded-2xl border border-line">
          <img src={asset(a.cover)} alt={a.coverAlt} className="aspect-video w-full object-cover" />
        </figure>

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            {outline.length > 0 && (
              <nav aria-label="In this story" className="sticky top-24 grid gap-1">
                <p className="mb-2 text-label-sm text-ink-subtle">In this story</p>
                {outline.map((b) => (
                  <a key={b.id} href={`#block-${b.id}`} aria-current={current === `block-${b.id}` ? "true" : undefined}
                    className={cx("inline-flex min-h-6 items-center border-l-2 py-1 pl-3 text-body-sm transition-colors duration-fast",
                      current === `block-${b.id}` ? "border-action text-ink" : "border-line text-ink-muted hover:text-ink", b.level === 3 && "pl-6")}>
                    {b.text}
                  </a>
                ))}
              </nav>
            )}
          </aside>
          <article className="min-w-0 lg:col-span-8">
            {a.note && <Banner tone="info" className="mb-8">{a.note}</Banner>}
            <div className="grid max-w-prose gap-6">
              {a.blocks.map((b) => <Block key={b.id} block={b} />)}
            </div>
            {a.sources.length > 0 && (
              <section aria-labelledby="sources-h" className="mt-12 max-w-prose border-t border-line pt-6">
                <h2 id="sources-h" className="text-label-md text-ink">Sources</h2>
                <ol className="mt-3 grid list-decimal gap-2 pl-5 text-body-sm text-ink-muted">
                  {a.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-link underline underline-offset-2">{s.label}<span className="sr-only"> (opens in a new tab)</span></a></li>)}
                </ol>
              </section>
            )}
            <p className="mt-10 text-body-sm text-ink-subtle">By <Link href={`/journal/authors/${authorSlug(articleAuthor(a))}/`} className="text-link underline underline-offset-2">{articleAuthor(a)}</Link> · {a.byline.split(" · ").slice(1).join(" · ")}</p>
          </article>
        </div>

        {more.length > 0 && (
          <section aria-labelledby="more-h" className="mt-20 border-t border-line pt-10">
            <h2 id="more-h" className="font-display text-display-sm text-ink">More from The Journal</h2>
            <ul className="mt-6 grid gap-6 md:grid-cols-3">
              {more.map((r) => (
                <li key={r.id} className="group relative overflow-hidden rounded-2xl border border-line bg-surface transition duration-base hover:-translate-y-0.5 hover:shadow-lg">
                  <img src={asset(r.cover)} alt="" loading="lazy" className="aspect-3/2 w-full object-cover" />
                  <div className="grid gap-1 p-5">
                    <p className="text-label-sm text-ink-brand">{r.category}</p>
                    <h3 className="font-display text-heading-md text-ink"><Link href={`/journal/${r.id}/`} className="after:absolute after:inset-0 group-hover:text-ink-brand">{r.title}</Link></h3>
                  </div>
                  <ArrowUpRight aria-hidden="true" className="absolute top-3 right-3 size-6 rounded-full bg-surface p-1 text-ink-brand shadow-sm" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Page>
  );
}

function Block({ block: b }: { block: ArticleBlock }) {
  const id = `block-${b.id}`;
  switch (b.type) {
    case "paragraph": return <p className="font-serif text-editorial-lg text-ink">{b.text}</p>;
    case "heading": return b.level === 3
      ? <h3 id={id} data-outline className="mt-4 scroll-mt-24 font-display text-heading-lg text-ink">{b.text}</h3>
      : <h2 id={id} data-outline className="mt-6 scroll-mt-24 font-display text-display-sm text-balance text-ink">{b.text}</h2>;
    case "quote": return <blockquote className="border-l-4 border-action py-1 pl-5 font-display text-heading-lg text-balance text-ink">{b.text}</blockquote>;
    case "image": return (
      <Reveal effect="fade-up">
        <figure className="-mx-0 grid gap-2 sm:-mx-8">
          <img src={asset(b.src ?? "")} alt={b.alt ?? ""} loading="lazy" className="w-full rounded-2xl border border-line object-cover" />
          {b.text && <figcaption className="text-caption text-ink-subtle sm:px-8">{b.text}</figcaption>}
        </figure>
      </Reveal>
    );
    case "budget": return <div id={id} data-outline className="scroll-mt-24"><BudgetPlanner /></div>;
    case "report": return <div id={id} data-outline className="scroll-mt-24"><IndustryChart /></div>;
    case "toolkit": return <div id={id} data-outline className="scroll-mt-24"><ProductionKit /></div>;
    default: return null;
  }
}
