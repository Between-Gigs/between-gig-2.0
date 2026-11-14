"use client";
import * as React from "react";
import Link from "next/link";
import { Button, Input } from "@ds/components";
import { Page } from "@/components/site/Page";
import { basePath } from "@/lib/site";
import { fetchPublicHtml, readShareMetadata, type ShareMetadata } from "@/lib/social-preview";

type Result = { metadata: ShareMetadata; url: string; checkedAt: string };
export function SocialPreview() {
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<Result | null>(null);
  const [imageState, setImageState] = React.useState("No image checked.");
  const request = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => request.current?.abort(), []);
  async function inspect(event: React.FormEvent) {
    event.preventDefault(); request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(""); setResult(null); setImageState("No image checked.");
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const source = await fetchPublicHtml(value.trim(), controller.signal);
      const metadata = readShareMetadata(new DOMParser().parseFromString(source.html, "text/html"), source.url);
      setImageState(metadata.image ? "Checking whether the share image loads in this browser…" : "No supported share image to load.");
      setResult({ metadata, url: source.url, checkedAt: new Date().toLocaleString() });
    } catch (reason) {
      setError(reason instanceof TypeError ? "This browser could not read the page. Cross-origin sites must allow CORS; redirects, network failures and access restrictions can also block inspection. Use a direct public URL. No preview was verified." : reason instanceof Error && reason.name === "AbortError" ? "The inspection timed out. No preview was verified." : reason instanceof Error ? reason.message : "The page could not be inspected.");
    } finally { clearTimeout(timeout); setBusy(false); }
  }
  const m = result?.metadata;
  return <Page>
    <Link href={basePath === "/hub" ? "/" : "/hub/"} className="inline-flex min-h-11 items-center text-label-md text-ink underline underline-offset-4">Hub</Link>
    <h1 className="mt-4 font-display text-display-sm text-ink">Social Previews</h1>
    <p className="mt-3 max-w-3xl text-body-lg text-ink-muted">Inspect the title, description and share image in a public page’s actual HTML. The card below is a reconstruction, not a result from a social platform’s scraper or cache.</p>
    <form onSubmit={inspect} className="mt-6 grid max-w-3xl gap-3">
      <label htmlFor="social-url" className="text-label-md text-ink">Public page URL</label>
      <Input id="social-url" type="url" required size="lg" value={value} onChange={event => setValue(event.target.value)} placeholder="https://between-gigs.com/" autoComplete="off" aria-describedby="social-help" />
      <p id="social-help" className="text-body-sm text-ink-muted">Reads without cookies or sign-in. Public HTTPS only. Cross-origin pages must allow browser access (CORS); redirecting URLs must be replaced with their direct destination. Client-injected metadata and platform-specific rendering are not tested.</p>
      <Button type="submit" size="lg" disabled={busy} className="justify-self-start">{busy ? "Inspecting…" : "Inspect page"}</Button>
    </form>
    <div aria-live="polite" className="mt-5 text-body-md text-ink">{busy ? "Reading page metadata…" : error ? <p role="alert">{error}</p> : result ? <p>HTML read at {result.checkedAt}. {imageState}</p> : null}</div>
    {result && m && <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
      <section aria-label="Reconstructed share card" className="min-w-0">
        <h2 className="font-display text-heading-md text-ink">Reconstructed share card</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
          {m.image && <img key={`${result.checkedAt}-${m.image}`} src={m.image} alt={m.imageAlt || "Share image from the inspected page"} referrerPolicy="no-referrer" className="aspect-video w-full object-contain bg-surface-sunken" onLoad={event => { const image = event.currentTarget; setImageState(`Share image loaded in this browser (${image.naturalWidth} × ${image.naturalHeight}). Social-platform access is unverified.`); }} onError={() => setImageState("Share image failed to load in this browser. Social-platform access is unverified.")} />}
          <div className="grid gap-2 p-5">
            <p className="break-all text-body-sm text-ink-muted">{new URL(result.url).hostname}</p>
            <h3 className="break-words font-display text-heading-md text-ink">{m.title || "No title found"}</h3>
            <p className="break-words text-body-md text-ink-muted">{m.description || "No description found"}</p>
          </div>
        </div>
        <p className="mt-3 text-body-sm text-ink-muted">Uses Open Graph, then Twitter, then HTML title/description fallback. Image loading verifies this browser only. It does not verify Facebook, LinkedIn, X or other crawlers.</p>
      </section>
      <section aria-label="Observed metadata" className="min-w-0">
        <h2 className="font-display text-heading-md text-ink">Observed metadata</h2>
        <dl className="mt-3 grid gap-4 rounded-xl border border-line bg-surface p-5 text-body-md text-ink">
          {[["Inspected URL", result.url], ["Canonical URL", m.canonical], ["og:title", m.ogTitle], ["og:description", m.ogDescription], ["og:image", m.ogImage], ["twitter:title", m.twitterTitle], ["twitter:description", m.twitterDescription], ["twitter:image", m.twitterImage], ["HTML title", m.pageTitle], ["HTML description", m.pageDescription], ["Robots", m.robots]].map(([key, content]) => <div key={key}><dt className="font-bold">{key}</dt><dd className="mt-1 whitespace-pre-wrap break-all text-ink-muted">{content || "Not present"}</dd></div>)}
        </dl>
        {m.warnings.length > 0 && <ul className="mt-4 list-disc space-y-2 pl-5 text-body-md text-ink">{m.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
      </section>
    </div>}
  </Page>;
}
