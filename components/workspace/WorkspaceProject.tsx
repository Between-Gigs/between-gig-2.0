"use client";
import { Badge, Button, Field, IconButton, Kbd, Modal, SegmentedControl, Textarea, cx, useToast } from "@ds/components";
import { ArrowLeft, ExternalLink, FileText, History, MessageSquare, Monitor, PanelsTopLeft, RotateCcw, RotateCw, Rocket, Smartphone, Tablet, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { appPages, githubUrl } from "@/lib/studio/app-pages";
import { basePath } from "@/lib/site";
import { folderOf, openHref, projectById, projects, statusLabel, updatedLabel } from "@/lib/workspace/projects";
import { ago, mergedProjects, projectHref, useLocal, versionsStore } from "@/lib/workspace/local";
import { CommentLayer, CommentList } from "./Comments";
import { Cover, FavoriteButton, SideLink, SideSection, WorkspaceShell, useWorkspaceLists } from "./WorkspaceShell";

type Device = "desktop" | "tablet" | "phone";
const widths: Record<Device, number | null> = { desktop: null, tablet: 834, phone: 390 };
const whoLabel = (as?: string) => !as ? "Visitor, signed out" : as === "owner" ? "The owner" : as === "invited" ? "Invited visitor"
  : `${(as.split(":")[1] ?? "").split("-")[0].replace(/^./, (c) => c.toUpperCase())}, a Gigster`;

/** /workspace/<project>/?page=… (or /workspace/open/?p=…&page=…): one project inside the shell, its pages on the left and the open page in the middle. */
export function WorkspaceProject({ projectId }: { projectId?: string }) {
  const params = useSearchParams();
  const { s } = useLocal();
  const wanted = projectId ?? params.get("p");
  // Built-in projects, or a copy made in this browser; renames apply to both.
  const merged = mergedProjects(s).find((p) => p.id === wanted);
  const project = merged ?? projectById(wanted) ?? projects[0];
  const page = project.pages.find((pg) => pg.id === params.get("page")) ?? project.pages[0];
  const { favorites, toggleFavorite, visit } = useWorkspaceLists();
  const [device, setDevice] = React.useState<Device>("desktop");
  const [nonce, setNonce] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const frame = React.useRef<HTMLIFrameElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [commenting, setCommenting] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [note, setNote] = React.useState("");
  const active = params.get("thread");
  const setActive = React.useCallback((id: string | null) => {
    const q = new URLSearchParams(params.toString());
    if (id) q.set("thread", id); else q.delete("thread");
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }, [params, pathname, router]);
  const versions = s.versions[project.id] ?? [];
  const live = versions[0];
  const openComments = s.threads.filter((t) => t.project === project.id && t.page === page.id && !t.resolved).length;
  React.useEffect(() => { visit(project.id); }, [project.id, visit]);
  // C toggles comment mode, Escape leaves it (not while typing).
  React.useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "c" || e.key === "C") { e.preventDefault(); setCommenting((v) => !v); }
      else if (e.key === "Escape" && !document.querySelector("dialog[open]")) { if (active) setActive(null); else if (commenting) setCommenting(false); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [commenting, active, setActive]);
  // Opening a thread from the list or a notification scrolls the page to its pin.
  React.useEffect(() => {
    const t = s.threads.find((x) => x.id === active);
    if (!t || loading) return;
    try { frame.current?.contentWindow?.scrollTo({ top: Math.max(0, t.y - 200), behavior: "smooth" }); } catch { /* ignore */ }
  }, [active, loading, s.threads]);
  // The frame can finish loading before React attaches onLoad; check once it's mounted.
  React.useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    const id = requestAnimationFrame(() => { try { if (frame.current?.contentDocument?.readyState === "complete" && frame.current.contentWindow?.location.href !== "about:blank") setLoading(false); } catch { /* ignore */ } });
    return () => cancelAnimationFrame(id);
  }, [page.id, nonce]);

  // The shell's Day/Night switch also switches the page inside, without a reload.
  React.useEffect(() => {
    const root = document.documentElement;
    const sync = () => { try { const d = frame.current?.contentDocument?.documentElement; const t = root.getAttribute("data-theme"); if (d && t) d.setAttribute("data-theme", t); } catch { /* cross-origin: ignore */ } };
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  const src = `${basePath}${page.path}`;
  const app = appPages.find((a) => a.id === page.id);
  const groups = Array.from(new Set(project.pages.map((pg) => pg.group ?? "")));
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => { const mq = window.matchMedia("(max-width: 40rem)"); const on = () => setNarrow(mq.matches); on(); mq.addEventListener("change", on); return () => mq.removeEventListener("change", on); }, []);
  // On a phone the page already is phone-sized: no device frame.
  const w = narrow ? null : widths[device];

  const sidebar = (
    <>
      <SideLink href="/workspace/" label="All projects" icon={<ArrowLeft />} />
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-sunken p-2.5">
        <span className="w-16 shrink-0 overflow-hidden rounded-md border border-line"><Cover project={project} /></span>
        <span className="grid min-w-0"><b className="truncate text-label-md text-ink">{project.name}</b><span className="text-caption text-ink-subtle">{statusLabel[project.status]} · {project.pages.length} {project.pages.length === 1 ? "page" : "pages"}</span></span>
      </div>
      {groups.map((g) => (
        <SideSection key={g} title={g || "Pages"}>
          {project.pages.filter((pg) => (pg.group ?? "") === g).map((pg) => (
            <SideLink key={pg.id} href={merged ? projectHref(merged, pg.id) : openHref(project.id, pg.id)} label={pg.title} icon={<FileText />} active={pg.id === page.id} />
          ))}
        </SideSection>
      ))}
    </>
  );

  const inspector = (
    <div className="grid">
      <section className="grid gap-2 p-5">
        <p className="text-eyebrow text-ink-brand uppercase">Page</p>
        <div className="flex items-start justify-between gap-2"><h2 className="font-display text-heading-lg text-ink">{page.title}</h2><FavoriteButton on={favorites.includes(project.id)} name={project.name} onToggle={() => toggleFavorite(project.id)} /></div>
        {page.note && <p className="text-body-sm text-ink-muted">{page.note}</p>}
        <dl className="mt-2 grid gap-2 text-body-sm">
          <div className="grid gap-0.5"><dt className="text-caption text-ink-subtle">Route</dt><dd className="font-mono text-data-sm break-all text-ink">{page.path}</dd></div>
          <div className="grid gap-0.5"><dt className="text-caption text-ink-subtle">Shown as</dt><dd className="text-ink">{whoLabel(page.as)}</dd></div>
          <div className="grid gap-0.5"><dt className="text-caption text-ink-subtle">Project</dt><dd className="text-ink">{project.name} · {folderOf(project.folder).name} · updated {updatedLabel(project.updated)}</dd></div>
        </dl>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href={src} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong px-3 text-label-md text-ink hover:bg-surface-hover"><ExternalLink className="size-4" aria-hidden="true" />Open in a new tab</a>
          {app && <Link href={`/studio/?site=${app.id}&tab=design`} className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong px-3 text-label-md text-ink hover:bg-surface-hover"><PanelsTopLeft className="size-4" aria-hidden="true" />Open in Studio</Link>}
        </div>
      </section>
      {app && (
        <section className="grid gap-2 border-t border-line p-5">
          <h3 className="text-label-sm text-ink-muted">Code behind it</h3>
          <ul className="grid gap-1">{app.files.map((f) => <li key={f}><a href={githubUrl(f)} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center font-mono text-data-sm break-all text-link underline-offset-2 hover:underline">{f}</a></li>)}</ul>
          {app.calls.length > 0 && <><h3 className="mt-2 text-label-sm text-ink-muted">Data calls</h3><ul className="flex flex-wrap gap-1.5">{app.calls.map((c) => <li key={c}><Badge tone="neutral" size="sm">{c}</Badge></li>)}</ul></>}
        </section>
      )}
      <CommentList project={project.id} page={page.id} onOpen={(t) => setActive(t.id)} />
      <section className="grid gap-2 border-t border-line p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-label-sm text-ink-muted"><History className="size-3.5" aria-hidden="true" />Version history</h3>
          <span className="text-caption text-ink-subtle">{live ? `Live: v${live.n}` : "Not published"}</span>
        </div>
        {versions.length === 0 ? <p className="text-body-sm text-ink-muted">Publish to record the first version. Each one keeps a note, so you can go back to it.</p> : (
          <ol className="grid gap-1">
            {versions.slice(0, 8).map((v, i) => (
              <li key={v.n} className="flex items-start justify-between gap-2 rounded-md px-2 py-2 hover:bg-surface-hover">
                <span className="grid min-w-0">
                  <span className="text-body-sm text-ink"><b className="font-semibold tabular-nums">v{v.n}</b>{i === 0 && <Badge tone="success" size="sm" className="ml-2">Live</Badge>}</span>
                  <span className="text-caption text-ink-subtle">{v.note || "No note"} · {v.by} · {ago(v.at)}</span>
                </span>
                {i > 0 && <Button size="sm" variant="ghost" iconStart={<RotateCcw />} onClick={() => { versionsStore.restore(project.id, project.name, v.n); toast({ message: `Restored v${v.n} as a new version`, tone: "success" }); }}>Restore</Button>}
              </li>
            ))}
          </ol>
        )}
        <p className="text-body-sm text-ink-subtle">Versions are recorded in this browser. The live site still deploys from GitHub on every push.</p>
      </section>
      {project.staticPages && <section className="border-t border-line p-5"><p className="text-body-sm text-ink-muted">A shared artifact: a plain static page kept with the preview, not part of the app's build.</p></section>}
    </div>
  );

  return (
    <WorkspaceShell project={project} crumb={page.title} sidebar={sidebar} sidebarTitle={project.name} inspector={inspector} inspectorTitle="Page details" bleed
      status={<>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={cx("size-2 rounded-full", loading ? "bg-warning" : "bg-success")} />{loading ? "Loading…" : "Live preview"}</span>
        <span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5" aria-hidden="true" />{whoLabel(page.as)}</span>
        <span className="inline-flex items-center gap-1.5"><MessageSquare className="size-3.5" aria-hidden="true" />{openComments} open {openComments === 1 ? "comment" : "comments"}</span>
        <span className="max-sm:hidden">{live ? `Published v${live.n} · ${ago(live.at)}` : "Not published"}</span>
        <span className="font-mono max-lg:hidden">{page.path}</span>
      </>}>
      <h1 className="sr-only">{project.name}: {page.title}</h1>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <SegmentedControl label="Device width" size="sm" className="max-sm:hidden" value={device} onChange={(v) => setDevice(v as Device)}
          options={[{ value: "desktop", label: "Desktop", icon: <Monitor /> }, { value: "tablet", label: "Tablet", icon: <Tablet /> }, { value: "phone", label: "Phone", icon: <Smartphone /> }]} />
        <span className="text-caption text-ink-subtle tabular-nums max-md:hidden">{w ? `${w}px` : "Full width"}</span>
        <Button size="sm" variant={commenting ? "secondary" : "ghost"} aria-pressed={commenting} iconStart={<MessageSquare />} onClick={() => setCommenting((v) => !v)}>
          {commenting ? "Commenting" : "Comment"}{openComments > 0 && <span className="ml-1 tabular-nums text-ink-subtle">{openComments}</span>}<Kbd keys={["C"]} className="ml-1.5 max-md:hidden" />
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Reload the page" variant="ghost" size="sm" icon={<RotateCw />} onClick={() => setNonce((n) => n + 1)} />
          <Button size="sm" variant="ghost" iconStart={<ExternalLink />} className="max-sm:hidden" onClick={() => window.open(src, "_blank", "noreferrer")}>New tab</Button>
          <Button size="sm" variant="primary" iconStart={<Rocket />} onClick={() => { setNote(""); setPublishing(true); }}>Publish</Button>
        </div>
      </div>
      {commenting && <p role="status" className="shrink-0 border-b border-line bg-info-soft px-3 py-1.5 text-body-sm text-ink">Click anywhere on the page to pin a comment. Press <Kbd keys={["C"]} /> or <Kbd keys={["Esc"]} /> to stop.</p>}
      <Modal open={publishing} onClose={() => setPublishing(false)} title={`Publish ${project.name}`} description={live ? `Live now: v${live.n}, ${ago(live.at)}. This records v${live.n + 1}.` : "This records v1."}
        footer={<><Button variant="ghost" onClick={() => setPublishing(false)}>Cancel</Button><Button variant="primary" iconStart={<Rocket />} onClick={() => { versionsStore.publish(project.id, project.name, note.trim()); setPublishing(false); toast({ message: `Published v${(live?.n ?? 0) + 1}`, tone: "success" }); }}>Publish v{(live?.n ?? 0) + 1}</Button></>}>
        <div className="grid gap-3">
          <Field label="What changed" optional hint="Shown in the version history and the team's notifications."><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <p className="text-body-sm text-ink-muted">Versions are recorded in this browser for now. The site itself deploys from GitHub on every push, so this marks a checkpoint rather than shipping a build.</p>
        </div>
      </Modal>
      <div className={cx("relative min-h-0 flex-1 overflow-auto", !!w && "studio-canvas p-4 sm:p-6")}>
        <div className={cx("relative mx-auto h-full overflow-hidden bg-bg", !!w && "rounded-2xl border border-line shadow-lg")} style={w ? { width: w, maxWidth: "100%" } : undefined}>
          <CommentLayer project={project.id} page={page.id} label={`${project.name} · ${page.title}`} frame={frame} nonce={`${page.id}-${nonce}-${loading}`} on={commenting} active={active} onActive={setActive} />
          <iframe ref={frame} key={`${page.id}-${nonce}`} name={`bg-preview:${page.as ?? "visitor"}`} src={src} title={`${page.title}, ${project.name}`} onLoad={() => setLoading(false)} className="block size-full border-0" />
        </div>
      </div>
    </WorkspaceShell>
  );
}
