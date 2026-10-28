"use client";
import { Badge, Button, IconButton, SegmentedControl, cx } from "@ds/components";
import { ArrowLeft, ExternalLink, FileText, Monitor, PanelsTopLeft, RotateCw, Smartphone, Tablet, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { appPages, githubUrl } from "@/lib/studio/app-pages";
import { basePath } from "@/lib/site";
import { folderOf, openHref, projectById, projects, statusLabel, updatedLabel } from "@/lib/workspace/projects";
import { Cover, FavoriteButton, SideLink, SideSection, WorkspaceShell, useWorkspaceLists } from "./WorkspaceShell";

type Device = "desktop" | "tablet" | "phone";
const widths: Record<Device, number | null> = { desktop: null, tablet: 834, phone: 390 };
const whoLabel = (as?: string) => !as ? "Visitor, signed out" : as === "owner" ? "The owner" : as === "invited" ? "Invited visitor"
  : `${(as.split(":")[1] ?? "").split("-")[0].replace(/^./, (c) => c.toUpperCase())}, a Gigster`;

/** /workspace/open/?p=…&page=…: one project inside the shell, its pages on the left and the open page in the middle. */
export function WorkspaceProject() {
  const params = useSearchParams();
  const project = projectById(params.get("p")) ?? projects[0];
  const page = project.pages.find((pg) => pg.id === params.get("page")) ?? project.pages[0];
  const { favorites, toggleFavorite, visit } = useWorkspaceLists();
  const [device, setDevice] = React.useState<Device>("desktop");
  const [nonce, setNonce] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const frame = React.useRef<HTMLIFrameElement>(null);
  React.useEffect(() => { visit(project.id); }, [project.id, visit]);
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
            <SideLink key={pg.id} href={openHref(project.id, pg.id)} label={pg.title} icon={<FileText />} active={pg.id === page.id} />
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
      {project.staticPages && <section className="border-t border-line p-5"><p className="text-body-sm text-ink-muted">A shared artifact: a plain static page kept with the preview, not part of the app's build.</p></section>}
    </div>
  );

  return (
    <WorkspaceShell project={project} crumb={page.title} sidebar={sidebar} sidebarTitle={project.name} inspector={inspector} inspectorTitle="Page details" bleed
      status={<>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={cx("size-2 rounded-full", loading ? "bg-warning" : "bg-success")} />{loading ? "Loading…" : "Live preview"}</span>
        <span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5" aria-hidden="true" />{whoLabel(page.as)}</span>
        <span className="font-mono max-sm:hidden">{page.path}</span>
      </>}>
      <h1 className="sr-only">{project.name}: {page.title}</h1>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <SegmentedControl label="Device width" size="sm" className="max-sm:hidden" value={device} onChange={(v) => setDevice(v as Device)}
          options={[{ value: "desktop", label: "Desktop", icon: <Monitor /> }, { value: "tablet", label: "Tablet", icon: <Tablet /> }, { value: "phone", label: "Phone", icon: <Smartphone /> }]} />
        <span className="text-caption text-ink-subtle tabular-nums max-md:hidden">{w ? `${w}px` : "Full width"}</span>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Reload the page" variant="ghost" size="sm" icon={<RotateCw />} onClick={() => setNonce((n) => n + 1)} />
          <Button size="sm" variant="ghost" iconStart={<ExternalLink />} onClick={() => window.open(src, "_blank", "noreferrer")}>New tab</Button>
        </div>
      </div>
      <div className={cx("relative min-h-0 flex-1 overflow-auto", !!w && "studio-canvas p-4 sm:p-6")}>
        <div className={cx("mx-auto h-full overflow-hidden bg-bg", !!w && "rounded-2xl border border-line shadow-lg")} style={w ? { width: w, maxWidth: "100%" } : undefined}>
          <iframe ref={frame} key={`${page.id}-${nonce}`} name={`bg-preview:${page.as ?? "visitor"}`} src={src} title={`${page.title}, ${project.name}`} onLoad={() => setLoading(false)} className="block size-full border-0" />
        </div>
      </div>
    </WorkspaceShell>
  );
}
