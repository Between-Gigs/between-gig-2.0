"use client";
/*
 * A page's source in the code editor: its own files first, then every file in the app to browse. Read-only by default;
 * Edit keeps a draft in this browser (marked as edited) without touching the repository. Open on GitHub for the real one.
 */
import { Badge, Button, Skeleton, Switch, cx } from "@ds/components";
import { ChevronRight, ExternalLink, FileCode2, Folder, RotateCcw } from "lucide-react";
import * as React from "react";
import { githubUrl } from "@/lib/studio/app-pages";
import { draftOf, saveDraft, sourceFile, sourceManifest, type SourceFile } from "@/lib/studio/source";
import { CodeEditor, languageOf } from "./CodeEditor";

export function SourceCode({ files }: { files: string[] }) {
  const [path, setPath] = React.useState(files[0]);
  const [text, setText] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<string | undefined>(undefined);
  const [all, setAll] = React.useState<SourceFile[]>([]);

  React.useEffect(() => { setPath(files[0]); }, [files]); // eslint-disable-line react-hooks/set-state-in-effect
  React.useEffect(() => { void sourceManifest().then(setAll); }, []);
  React.useEffect(() => {
    let live = true;
    setText(null); setError(null); setDraft(draftOf(path)); // eslint-disable-line react-hooks/set-state-in-effect
    sourceFile(path).then((t) => { if (live) setText(t); }, (e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [path]);

  const lines = all.find((f) => f.path === path)?.lines;
  const edited = draft !== undefined && draft !== text;
  const onChange = (v: string) => { setDraft(v); saveDraft(path, v === text ? undefined : v); };

  return (
    <div className="flex min-h-0 flex-1 bg-surface">
      <nav aria-label="Source files" className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-line md:flex">
        <p className="px-3 pt-3 pb-1 text-label-sm text-ink-subtle">This page</p>
        <ul className="grid gap-0.5 px-1.5">
          {files.map((f) => <FileRow key={f} path={f} active={f === path} onOpen={setPath} edited={draftOf(f) !== undefined} />)}
        </ul>
        <AllFiles all={all} active={path} onOpen={setPath} />
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-1.5">
          {/* Phones: pick the file from a list. */}
          <select aria-label="File" value={path} onChange={(e) => setPath(e.target.value)}
            className="h-8 max-w-full min-w-0 rounded-md border border-line bg-surface px-2 text-body-sm text-ink md:hidden">
            {[...new Set([...files, ...all.map((f) => f.path)])].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <p className="hidden min-w-0 truncate font-mono text-data-sm text-ink md:block" title={path}>{path}</p>
          {lines && <span className="hidden text-caption text-ink-subtle tabular-nums md:inline">{lines} lines</span>}
          {edited && <Badge size="sm" tone="warning">Edited in this browser</Badge>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Switch checked={editing} onChange={setEditing} label="Edit" />
            {edited && <Button size="sm" variant="ghost" iconStart={<RotateCcw />} onClick={() => { setDraft(undefined); saveDraft(path, undefined); }}>Discard edits</Button>}
            <a href={githubUrl(path)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-label-sm text-link hover:bg-surface-hover">
              <ExternalLink className="size-3.5" aria-hidden="true" />GitHub<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
        {editing && <p className="border-b border-line bg-warning-soft px-3 py-1.5 text-body-sm text-ink">Edits stay in this browser as a draft. The site and the repository don&apos;t change.</p>}
        {error ? (
          <p className="p-5 text-body-md text-ink-muted">{error}. The code editor reads the files exported with this build.</p>
        ) : text === null ? (
          <div className="grid gap-2 p-4" aria-busy="true" aria-label="Loading the file">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-3.5" />)}</div>
        ) : (
          <CodeEditor key={`${path}-${editing}`} className="min-h-0 flex-1 overflow-hidden" label={`${path}${editing ? "" : ", read only"}`}
            language={languageOf(path)} value={draft ?? text} onChange={editing ? onChange : undefined} />
        )}
      </div>
    </div>
  );
}

function FileRow({ path, active, onOpen, edited, name }: { path: string; active: boolean; onOpen: (p: string) => void; edited?: boolean; name?: string }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(path)} aria-current={active ? "true" : undefined} title={path}
        className={cx("flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-body-sm",
          active ? "bg-surface-selected text-ink" : "text-ink-muted hover:bg-surface-hover hover:text-ink")}>
        <FileCode2 className="size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
        <span className="min-w-0 truncate">{name ?? path.split("/").pop()}</span>
        {edited && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-warning" aria-label="edited" />}
      </button>
    </li>
  );
}

/** Every file in the build, folder by folder. */
function AllFiles({ all, active, onOpen }: { all: SourceFile[]; active: string; onOpen: (p: string) => void }) {
  const dirs = React.useMemo(() => {
    const m = new Map<string, SourceFile[]>();
    for (const f of all) { const d = f.path.slice(0, f.path.lastIndexOf("/")); m.set(d, [...(m.get(d) ?? []), f]); }
    return [...m.entries()];
  }, [all]);
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  React.useEffect(() => { const d = active.slice(0, active.lastIndexOf("/")); setOpen((s) => (s.has(d) ? s : new Set(s).add(d))); }, [active]); // eslint-disable-line react-hooks/set-state-in-effect
  if (!all.length) return null;
  return (
    <>
      <p className="mt-3 px-3 pt-3 pb-1 text-label-sm text-ink-subtle border-t border-line">All files · {all.length}</p>
      <ul className="grid gap-0.5 px-1.5 pb-3">
        {dirs.map(([d, fs]) => {
          const isOpen = open.has(d);
          return (
            <li key={d}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(d)) n.delete(d); else n.add(d); return n; })}
                className="flex h-8 w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-left text-body-sm text-ink hover:bg-surface-hover">
                <ChevronRight className={cx("size-3.5 shrink-0 text-ink-subtle transition-transform duration-fast", isOpen && "rotate-90")} aria-hidden="true" />
                <Folder className="size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" /><span className="min-w-0 truncate">{d}</span>
              </button>
              {isOpen && <ul className="ml-4 grid gap-0.5">{fs.map((f) => <FileRow key={f.path} path={f.path} active={f.path === active} onOpen={onOpen} edited={draftOf(f.path) !== undefined} />)}</ul>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
