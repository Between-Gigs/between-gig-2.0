"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpRight, Check, Clipboard, Monitor, Smartphone } from "lucide-react";
import { Button, SegmentedControl, cx } from "@ds/components";
import { Page } from "@/components/site/Page";
import { useProfileTemplate } from "@/lib/profile/use-profile-template";
import {
  defaultProfileTemplate, encodeProfileTemplate, parseProfileTemplate, profileFieldParts, profileParts, profileSections,
  ruleLabels, saveProfileTemplate, type ProfileFieldRule, type ProfileTemplate,
} from "@/lib/profile/template";
import { data } from "@/lib/data";
import { basePath } from "@/lib/site";
import { professionalExamples } from "@/lib/professional-examples";

type Screen = "canvas" | "form" | "page";
const fields = Object.keys(profileFieldParts) as ProfileFieldRule[];
const screenOptions = [{ value: "canvas", label: "Guided editor" }, { value: "form", label: "Questionnaire" }, { value: "page", label: "Client page" }];

function move<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const next = [...items];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
}

function Reorder({ title, at, total, onMove }: { title: string; at: number; total: number; onMove: (dir: -1 | 1) => void }) {
  return <span className="inline-flex shrink-0 gap-1">
    {([-1, 1] as const).map((dir) => (
      <button key={dir} type="button" aria-label={`Move ${title} ${dir < 0 ? "up" : "down"}`}
        disabled={at + dir < 0 || at + dir >= total} onClick={() => onMove(dir)}
        className="grid size-9 place-items-center rounded-md text-ink-muted hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-default disabled:opacity-25 max-sm:size-11">
        {dir === -1 ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
      </button>
    ))}
  </span>;
}

function watchHash(notify: () => void) {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
}
function sharedSettings() { return new URLSearchParams(location.hash.slice(1)).get("template"); }

export function ProfileTemplateEditor() {
  const saved = useProfileTemplate();
  const sharedRaw = React.useSyncExternalStore(watchHash, sharedSettings, () => null);
  const shared = React.useMemo(() => sharedRaw === null ? null : parseProfileTemplate(sharedRaw), [sharedRaw]);
  const [edits, setEdits] = React.useState<{ source: string | null; template: ProfileTemplate } | null>(null);
  const [tab, setTab] = React.useState<"fields" | "page">("fields");
  const [screen, setScreen] = React.useState<Screen>("canvas");
  const [person, setPerson] = React.useState<string>(professionalExamples[0].id);
  const [device, setDevice] = React.useState("desktop");
  const [message, setMessage] = React.useState("");
  const [shareUrl, setShareUrl] = React.useState("");
  const router = useRouter();
  const previewPanel = React.useRef<HTMLElement>(null);
  const settingsPanel = React.useRef<HTMLElement>(null);
  const draft = edits && edits.source === sharedRaw ? edits.template : shared ?? saved;
  const encoded = encodeProfileTemplate(draft);
  const dirty = encoded !== encodeProfileTemplate(saved);
  const edit = (next: ProfileTemplate) => { setEdits({ source: sharedRaw, template: next }); setMessage(""); setShareUrl(""); };
  const tabTo = (value: string) => { const page = value === "page"; setTab(page ? "page" : "fields"); setScreen(page ? "page" : "canvas"); };
  const href = screen === "canvas" ? "/profile/canvas/" : screen === "form" ? "/profile/edit/" : `/p/${person}/`;

  const apply = () => {
    const persistent = saveProfileTemplate(draft);
    window.history.replaceState(window.history.state, "", location.pathname + location.search);
    window.dispatchEvent(new Event("hashchange"));
    setEdits(null);
    setMessage(persistent ? "Applied to the previews in this browser." : "Applied for this visit. Browser storage is unavailable.");
  };
  const share = async () => {
    const url = new URL(location.href);
    url.search = "";
    url.hash = new URLSearchParams({ template: encoded }).toString();
    setShareUrl(url.href);
    try { await navigator.clipboard.writeText(url.href); setMessage("Review link copied."); }
    catch { setMessage("Select and copy the review link below."); }
  };
  const open = async () => {
    if (dirty) apply();
    try {
      if (screen === "page") {
        const sample = await data.people.get(person);
        if (!sample?.person.sample || sample.person.status !== "approved" || !sample.person.slug) {
          setMessage("This sample is waiting for review. Open its guided editor to see the draft.");
          return;
        }
        router.push(`/p/${encodeURIComponent(sample.person.slug)}/`);
      } else {
        await data.demo?.signInAs("gigster", person);
        router.push(href);
      }
    } catch { setMessage("The sample could not open. Please try again."); }
  };
  return (
    <Page>
      <header data-call-sheet-stage="intro" className="mb-8 grid gap-4 pt-3">
        <Link href="/preview/" className="w-fit text-label-md text-link underline underline-offset-4">Preview guide</Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-display text-display-sm text-ink">Gigster profile editor</h1>
            <p className="mt-3 text-body-lg text-ink-muted">Choose what Gigsters need to answer and how clients read their profile. Apply changes to this browser’s preview or share a copy for review.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button iconStart={<Clipboard />} onClick={share}>Copy review link</Button>
            <Button variant="primary" iconStart={<Check />} disabled={!dirty} onClick={apply}>Apply settings</Button>
          </div>
        </div>
        {sharedRaw !== null && <p role="status" className="rounded-lg bg-surface-selected p-3 text-body-md text-ink">{shared ? "Shared template loaded for review. Apply settings to use it in this browser." : "This review link contains an invalid template. Your saved settings are shown."}</p>}
        {message && <p role="status" className="text-body-sm text-ink-brand">{message}</p>}
        {shareUrl && <label className="grid max-w-2xl gap-1 text-label-md">Review link
          <input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className="h-11 rounded-md border border-line bg-surface px-3 text-body-sm" />
        </label>}
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <section ref={settingsPanel} tabIndex={-1} aria-label="Template settings" className="grid scroll-mt-24 gap-4 outline-none">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SegmentedControl label="Template settings" value={tab} onChange={tabTo} options={[{ value: "fields", label: "Form fields" }, { value: "page", label: "Page sections" }]} />
            <Button size="sm" variant="ghost" onClick={() => { edit(defaultProfileTemplate); setMessage("Default settings loaded for review."); }}>Restore defaults</Button>
          </div>
          <button type="button" onClick={() => { previewPanel.current?.focus({ preventScroll: true }); previewPanel.current?.scrollIntoView({ block: "start" }); }} className="w-fit text-label-md text-link underline underline-offset-4 lg:hidden">See live preview</button>
          {tab === "fields" ? (
            <>
              <div><h2 className="font-display text-heading-lg">Form fields</h2><p className="mt-1 text-body-sm text-ink-muted">{draft.required.length} required answers. Move a group to change the order of the guided editor.</p></div>
              <ol className="grid divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {draft.order.map((part, i) => {
                  const rules = fields.filter((k) => profileFieldParts[k] === part);
                  return <li key={part} className="grid gap-1 p-3 sm:px-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-label-md">{profileParts[part]}</h3>
                      <Reorder title={profileParts[part]} at={i} total={draft.order.length} onMove={(dir) => edit({ ...draft, order: move(draft.order, i, dir) })} />
                    </div>
                    {rules.map((k) => <label key={k} className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 text-body-sm">
                      <span>{rules.length > 1 ? ruleLabels[k] : "Required before submission"}</span>
                      <span className="inline-flex items-center gap-2">
                        {rules.length > 1 && <span className="text-ink-muted">{draft.required.includes(k) ? "Required" : "Optional"}</span>}
                        <input type="checkbox" checked={draft.required.includes(k)} aria-label={`Require ${ruleLabels[k]}`}
                          onChange={(e) => edit({ ...draft, required: e.target.checked ? [...draft.required, k] : draft.required.filter((id) => id !== k) })}
                          className="size-5 accent-action" />
                      </span>
                    </label>)}
                  </li>;
                })}
              </ol>
            </>
          ) : (
            <>
              <div><h2 className="font-display text-heading-lg">Page sections</h2><p className="mt-1 text-body-sm text-ink-muted">Set the reading order below the profile header. Empty sections are omitted from the client view.</p></div>
              <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {draft.sections.map((section, i) => <li key={section} className="flex min-h-14 items-center justify-between gap-2 px-4">
                  <h3 className="text-label-md"><span className="mr-3 text-ink-muted tabular-nums">{i + 1}</span>{profileSections[section]}</h3>
                  <Reorder title={profileSections[section]} at={i} total={draft.sections.length} onMove={(dir) => edit({ ...draft, sections: move(draft.sections, i, dir) })} />
                </li>)}
              </ol>
            </>
          )}
        </section>
        <aside ref={previewPanel} tabIndex={-1} aria-label="Sample preview" className="grid min-w-0 scroll-mt-24 gap-3 outline-none rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-24">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-heading-md">Live preview</h2>
            <select aria-label="Sample Gigster" value={person} onChange={(e) => setPerson(e.target.value)} className="min-h-11 rounded-md border border-line bg-bg px-3 text-label-md">
              {professionalExamples.map((sample) => <option key={sample.id} value={sample.id}>{sample.name}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SegmentedControl label="Preview screen" size="sm" value={screen} onChange={(v) => setScreen(v as Screen)} options={screenOptions} />
            <SegmentedControl label="Viewport" size="sm" value={device} onChange={setDevice} options={[{ value: "desktop", label: <><Monitor /><span className="sr-only">Desktop</span></> }, { value: "phone", label: <><Smartphone /><span className="sr-only">Phone</span></> }]} />
          </div>
          <TemplateFrame key={screen} href={href} as={screen === "page" ? "visitor" : `gigster:${person}`} encoded={encoded} device={device} showSections={screen === "page"} />
          <button type="button" onClick={() => { settingsPanel.current?.focus({ preventScroll: true }); settingsPanel.current?.scrollIntoView({ block: "start" }); }} className="w-fit text-label-md text-link underline underline-offset-4 lg:hidden">Back to settings</button>
          <Button iconEnd={<ArrowUpRight />} onClick={open}>{dirty ? "Apply and open" : "Open"} {screenOptions.find((x) => x.value === screen)?.label.toLowerCase()}</Button>
        </aside>
      </div>
    </Page>
  );
}

function TemplateFrame({ href, as, encoded, device, showSections }: { href: string; as: string; encoded: string; device: string; showSections: boolean }) {
  const host = React.useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = React.useState(0);
  const [appearance, setAppearance] = React.useState("");
  const [at, setAt] = React.useState(showSections ? "sections" : "top");
  React.useEffect(() => {
    const root = document.documentElement;
    const appearanceChanged = () => setAppearance([root.dataset.look, root.dataset.theme].join("/"));
    appearanceChanged();
    const mo = new MutationObserver(appearanceChanged);
    mo.observe(root, { attributes: true, attributeFilter: ["data-look", "data-theme"] });
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    if (host.current) ro.observe(host.current);
    return () => { ro.disconnect(); mo.disconnect(); };
  }, []);
  const width = device === "phone" ? 390 : 1200;
  const height = device === "phone" ? 580 : 800;
  const scale = Math.min(1, boxWidth / width);
  const frame = React.useRef<HTMLIFrameElement>(null);
  // The materialized profile loads asynchronously. The observer stops once the requested section is present.
  React.useEffect(() => {
    const el = frame.current;
    if (!el || !showSections) return;
    let observer: MutationObserver | undefined;
    const scroll = () => {
      observer?.disconnect();
      const win = el.contentWindow;
      const doc = el.contentDocument;
      if (!win || !doc) return;
      const target = at === "sections" ? doc.querySelector<HTMLElement>("[data-profile-section]") : null;
      if (at === "top" || target) win.scrollTo(0, target ? target.getBoundingClientRect().top + win.scrollY - 85 : 0);
      else { observer = new MutationObserver(scroll); observer.observe(doc, { childList: true, subtree: true }); }
    };
    el.addEventListener("load", scroll);
    scroll();
    return () => { el.removeEventListener("load", scroll); observer?.disconnect(); };
  }, [at, href, encoded, as, appearance, device, showSections, boxWidth]);
  return <>
    {showSections && <SegmentedControl label="Preview position" size="sm" value={at} onChange={setAt} options={[{ value: "top", label: "Header" }, { value: "sections", label: "Sections" }]} />}
    <div ref={host} className={cx("relative mx-auto w-full overflow-hidden rounded-lg border border-line bg-surface-sunken", device === "phone" && "max-w-sm")} style={{ height: scale ? height * scale : undefined }}>
      {scale > 0 && <iframe key={[href, as, encoded, appearance, device].join("|")} ref={frame} name={`bg-preview:${as}`} src={`${basePath}${href}`}
        data-guide-thumbnail="" data-profile-template={encoded} title="Sample profile layout" tabIndex={-1}
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0" style={{ width, height, maxWidth: "none", transform: `scale(${scale})` }} />}
    </div>
  </>;
}
