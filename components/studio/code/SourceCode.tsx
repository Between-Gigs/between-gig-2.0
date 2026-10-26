"use client";
/*
 * A page's source in the code editor: its own files as tabs, then every file in the app to browse. Read-only by default;
 * Edit keeps a draft in this browser (marked as edited) without touching the repository. Changes shows every draft as a
 * diff and copies them as a patch a developer can apply. GitHub opens the real file.
 */
import { Badge, Button, Input, Modal, Skeleton, Switch, cx } from "@ds/components";
import { Braces, Check, ChevronRight, Copy, ExternalLink, FileCode2, FileDiff, Folder, Palette, RotateCcw, Search, Trash2 } from "lucide-react";
import * as React from "react";
import { githubUrl } from "@/lib/studio/app-pages";
import { diffLines, hunks, unifiedPatch } from "@/lib/studio/diff";
import { draftOf, draftPaths, saveDraft, sourceFile, sourceManifest, type SourceFile } from "@/lib/studio/source";
import { CodeEditor, languageOf } from "./CodeEditor";

/** A file's icon and colour by type, like an editor's file tree. */
function FileIcon({ path, className }: { path: string; className?: string }) {
  const l = languageOf(path);
  const Icon = l === "css" ? Palette : l === "tsx" ? Braces : FileCode2;
  return <Icon aria-hidden="true" className={cx("size-3.5 shrink-0", l === "css" ? "text-cat-3" : l === "tsx" ? "text-cat-4" : "text-cat-2", className)} />;
}
const langName = { tsx: "TypeScript React", ts: "TypeScript", js: "JavaScript", css: "CSS", html: "HTML" };

export function SourceCode({ files }: { files: string[] }) {
  const [path, setPath] = React.useState(files[0]);
  const [text, setText] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<string | undefined>(undefined);
  const [all, setAll] = React.useState<SourceFile[]>([]);
  const [drafts, setDrafts] = React.useState<string[]>([]);
  const [changes, setChanges] = React.useState(false);

  React.useEffect(() => { setPath(files[0]); }, [files]); // eslint-disable-line react-hooks/set-state-in-effect
  React.useEffect(() => { void sourceManifest().then(setAll); setDrafts(draftPaths()); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    let live = true;
    setText(null); setError(null); setDraft(draftOf(path)); // eslint-disable-line react-hooks/set-state-in-effect
    sourceFile(path).then((t) => { if (live) setText(t); }, (e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [path]);

  const lines = all.find((f) => f.path === path)?.lines;
  const edited = draft !== undefined && draft !== text;
  const onChange = (v: string) => { setDraft(v); saveDraft(path, v === text ? undefined : v); setDrafts(draftPaths()); };
  const discard = (p: string) => { saveDraft(p, undefined); setDrafts(draftPaths()); if (p === path) setDraft(undefined); };
  const tabs = files.includes(path) ? files : [...files, path];

  return (
    <div className="flex min-h-0 flex-1 bg-surface">
      <nav aria-label="Source files" className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface-sunken/50 md:flex">
        <p className="px-3 pt-3 pb-1.5 text-label-sm text-ink-subtle">This page</p>
        <ul className="grid gap-0.5 px-1.5">
          {files.map((f) => <FileRow key={f} path={f} active={f === path} onOpen={setPath} edited={drafts.includes(f)} />)}
        </ul>
        <AllFiles all={all} active={path} onOpen={setPath} drafts={drafts} />
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Editor tabs: the page's files, plus whatever is open from the tree. */}
        <div className="flex min-w-0 items-end gap-0.5 overflow-x-auto border-b border-line bg-surface-sunken/50 px-2 pt-1.5">
          <div role="tablist" aria-label="Open files" className="hidden min-w-0 items-end gap-0.5 md:flex">
            {tabs.map((f) => {
              const on = f === path;
              return (
                <button key={f} type="button" role="tab" aria-selected={on} onClick={() => setPath(f)} title={f}
                  className={cx("inline-flex h-9 max-w-56 shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3 text-label-sm transition-colors duration-fast",
                    on ? "-mb-px border-line bg-surface text-ink" : "border-transparent text-ink-muted hover:bg-surface-hover hover:text-ink")}>
                  <FileIcon path={f} /><span className="truncate">{f.split("/").pop()}</span>
                  {drafts.includes(f) && <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-label="edited" />}
                </button>
              );
            })}
          </div>
          {/* Phones: pick the file from a list. */}
          <select aria-label="File" value={path} onChange={(e) => setPath(e.target.value)}
            className="mb-1.5 h-8 max-w-full min-w-0 rounded-md border border-line bg-surface px-2 text-body-sm text-ink md:hidden">
            {[...new Set([...files, ...all.map((f) => f.path)])].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-1.5">
          <p className="hidden min-w-0 items-center gap-1 truncate font-mono text-data-sm text-ink-muted md:flex" title={path}>
            {path.split("/").map((part, i, a) => <React.Fragment key={i}>{i > 0 && <ChevronRight className="size-3 shrink-0 text-ink-subtle" aria-hidden="true" />}<span className={cx(i === a.length - 1 && "text-ink")}>{part}</span></React.Fragment>)}
          </p>
          {edited && <Badge size="sm" tone="warning">Edited in this browser</Badge>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Switch checked={editing} onChange={setEditing} label="Edit" />
            {edited && <Button size="sm" variant="ghost" iconStart={<RotateCcw />} onClick={() => discard(path)}>Discard</Button>}
            <Button size="sm" variant={drafts.length ? "secondary" : "ghost"} iconStart={<FileDiff />} onClick={() => setChanges(true)} disabled={!drafts.length}
              title={drafts.length ? "Every edit, as a diff and a patch" : "No edits yet: switch on Edit to make some"}>
              Changes{drafts.length ? ` · ${drafts.length}` : ""}
            </Button>
            <a href={githubUrl(path)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-label-sm text-link hover:bg-surface-hover">
              <ExternalLink className="size-3.5" aria-hidden="true" />GitHub<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
        {editing && <p className="border-b border-line bg-warning-soft px-3 py-1.5 text-body-sm text-ink">Edits stay in this browser as a draft. The site and the repository don&apos;t change; Changes copies them as a patch for a developer.</p>}
        {error ? (
          <p className="p-5 text-body-md text-ink-muted">{error}. The code editor reads the files exported with this build.</p>
        ) : text === null ? (
          <div className="grid gap-2 p-4" aria-busy="true" aria-label="Loading the file">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className={cx("h-3.5", ["w-3/4", "w-1/2", "w-5/6", "w-2/3"][i % 4])} />)}</div>
        ) : (
          <CodeEditor key={`${path}-${editing}`} className="min-h-0 flex-1 overflow-hidden" label={`${path}${editing ? "" : ", read only"}`}
            language={languageOf(path)} value={draft ?? text} onChange={editing ? onChange : undefined} />
        )}
        {/* Status bar. */}
        <div className="flex items-center gap-3 border-t border-line bg-surface-sunken/60 px-3 py-1 text-caption text-ink-subtle">
          <span>{langName[languageOf(path)]}</span>
          {lines && <span className="tabular-nums">{lines} lines</span>}
          <span className="ml-auto">{editing ? "Editing a draft" : "Read only"}</span>
        </div>
      </div>
      <ChangesDialog open={changes} onClose={() => setChanges(false)} paths={drafts} onDiscard={discard} onOpen={(p) => { setPath(p); setChanges(false); }} />
    </div>
  );
}

function FileRow({ path, active, onOpen, edited }: { path: string; active: boolean; onOpen: (p: string) => void; edited?: boolean }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(path)} aria-current={active ? "true" : undefined} title={path}
        className={cx("flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-body-sm",
          active ? "bg-info/12 text-info" : "text-ink-muted hover:bg-surface-hover hover:text-ink")}>
        <FileIcon path={path} />
        <span className="min-w-0 truncate">{path.split("/").pop()}</span>
        {edited && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-warning" aria-label="edited" />}
      </button>
    </li>
  );
}

/** Every file in the build, folder by folder, with a filter. */
function AllFiles({ all, active, onOpen, drafts }: { all: SourceFile[]; active: string; onOpen: (p: string) => void; drafts: string[] }) {
  const [q, setQ] = React.useState("");
  const dirs = React.useMemo(() => {
    const m = new Map<string, SourceFile[]>();
    for (const f of all) {
      if (q && !f.path.toLowerCase().includes(q.toLowerCase())) continue;
      const d = f.path.slice(0, f.path.lastIndexOf("/")); m.set(d, [...(m.get(d) ?? []), f]);
    }
    return [...m.entries()];
  }, [all, q]);
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  React.useEffect(() => { const d = active.slice(0, active.lastIndexOf("/")); setOpen((s) => (s.has(d) ? s : new Set(s).add(d))); }, [active]); // eslint-disable-line react-hooks/set-state-in-effect
  if (!all.length) return null;
  return (
    <>
      <div className="mt-3 grid gap-2 border-t border-line px-3 pt-3 pb-1.5">
        <p className="text-label-sm text-ink-subtle">All files · {all.length}</p>
        <Input type="search" size="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter files" aria-label="Filter files" start={<Search />} />
      </div>
      <ul className="grid gap-0.5 px-1.5 pb-3">
        {dirs.map(([d, fs]) => {
          const isOpen = !!q || open.has(d);
          return (
            <li key={d}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(d)) n.delete(d); else n.add(d); return n; })}
                className="flex h-8 w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-left text-body-sm text-ink hover:bg-surface-hover">
                <ChevronRight className={cx("size-3.5 shrink-0 text-ink-subtle transition-transform duration-fast", isOpen && "rotate-90")} aria-hidden="true" />
                <Folder className="size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" /><span className="min-w-0 truncate">{d}</span>
                <span className="ml-auto text-caption text-ink-subtle tabular-nums">{fs.length}</span>
              </button>
              {isOpen && <ul className="ml-4 grid gap-0.5 border-l border-line pl-1">{fs.map((f) => <FileRow key={f.path} path={f.path} active={f.path === active} onOpen={onOpen} edited={drafts.includes(f.path)} />)}</ul>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Every draft as a diff, and all of them as one patch. */
function ChangesDialog({ open, onClose, paths, onDiscard, onOpen }: { open: boolean; onClose: () => void; paths: string[]; onDiscard: (p: string) => void; onOpen: (p: string) => void }) {
  const [originals, setOriginals] = React.useState<Record<string, string>>({});
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    void Promise.all(paths.map(async (p) => [p, await sourceFile(p).catch(() => "")] as const)).then((pairs) => setOriginals(Object.fromEntries(pairs)));
  }, [open, paths]);
  const ready = paths.every((p) => p in originals);
  const patch = ready ? paths.map((p) => unifiedPatch(p, originals[p], draftOf(p) ?? originals[p])).join("") : "";
  const copy = async () => { try { await navigator.clipboard.writeText(patch); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ } };
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Your code changes" description="Edits kept in this browser, against the code this site was built from. Copy them as a patch for a developer to apply with git apply."
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="primary" iconStart={copied ? <Check /> : <Copy />} onClick={copy} disabled={!ready || !patch}>{copied ? "Patch copied" : "Copy as patch"}</Button></>}>
      <div className="grid max-h-96 gap-4 overflow-y-auto">
        {!paths.length && <p className="text-body-md text-ink-muted">No edits yet.</p>}
        {paths.map((p) => {
          const hs = ready ? hunks(diffLines(originals[p], draftOf(p) ?? originals[p])) : [];
          const added = hs.reduce((n, h) => n + h.lines.filter((l) => l.kind === "+").length, 0), removed = hs.reduce((n, h) => n + h.lines.filter((l) => l.kind === "-").length, 0);
          return (
            <section key={p} aria-label={p} className="overflow-hidden rounded-lg border border-line">
              <header className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-sunken px-3 py-2">
                <FileIcon path={p} /><button type="button" onClick={() => onOpen(p)} className="min-w-0 truncate font-mono text-data-sm text-ink hover:text-info hover:underline">{p}</button>
                <span className="text-caption tabular-nums"><span className="text-success">+{added}</span> <span className="text-danger">−{removed}</span></span>
                <Button size="sm" variant="ghost" iconStart={<Trash2 />} className="ml-auto" onClick={() => onDiscard(p)}>Discard</Button>
              </header>
              {!ready ? <div className="p-3"><Skeleton className="h-16" /></div> : (
                <pre className="overflow-x-auto py-1 font-mono text-data-sm leading-6">
                  {hs.map((h, i) => (
                    <React.Fragment key={i}>
                      <div className="bg-info/10 px-3 text-ink-subtle">@@ −{h.aStart},{h.aLen} +{h.bStart},{h.bLen} @@</div>
                      {h.lines.map((l, j) => (
                        <div key={j} className={cx("px-3 whitespace-pre", l.kind === "+" ? "bg-success-soft text-ink" : l.kind === "-" ? "bg-danger/10 text-ink" : "text-ink-muted")}>
                          <span aria-hidden="true" className="mr-3 inline-block w-3 text-ink-subtle select-none">{l.kind === " " ? "" : l.kind}</span>{l.text || " "}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </pre>
              )}
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
