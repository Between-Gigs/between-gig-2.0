"use client";
/*
 * The Designer's Code tool: the page as code. index.html and styles.css are generated from the canvas (read-only, the
 * way a site builder exports); custom.css is yours, saved with the page and applied on the canvas and in the preview,
 * with the page's classes one click (or a "." and a few letters) away. Download one file, or all three as a .zip.
 */
import { Button, cx } from "@ds/components";
import { Check, CloudCheck, Copy, Download, FileArchive, FileCode2, FileType, Lock, Palette, PencilLine } from "lucide-react";
import * as React from "react";
import { exportPage, pageClasses } from "@/lib/studio/export";
import { useStudio } from "@/lib/studio/store";
import type { Page } from "@/lib/studio/types";
import { zipFiles } from "@/lib/studio/zip";
import { CodeEditor, type CodeEditorHandle, type CodeLanguage } from "./CodeEditor";

type FileId = "html" | "css" | "custom";
const files: { id: FileId; name: string; language: CodeLanguage; icon: React.ComponentType<{ className?: string }>; tone: string; note: string }[] = [
  { id: "html", name: "index.html", language: "html", icon: FileCode2, tone: "text-cat-5", note: "Generated from the canvas, so it's read-only. Change the page there; this updates as you go." },
  { id: "css", name: "styles.css", language: "css", icon: Palette, tone: "text-cat-3", note: "Every class, cascading desktop → tablet → phone through media queries. Generated from the Style panel." },
  { id: "custom", name: "custom.css", language: "css", icon: FileType, tone: "text-cat-4", note: "Yours: saved with the page and applied on the canvas and in the preview. Style-panel values win unless you add !important." },
];

const starter = "/* Your CSS for this page. Type . for the classes it uses, or click one above. For example:\n.hero-title { letter-spacing: -0.02em; } */";

const save = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function PageCode({ page, file, onFile }: { page: Page; file: FileId; onFile: (f: FileId) => void }) {
  const { base, actions } = useStudio();
  const code = React.useMemo(() => (base ? exportPage(base, page) : { html: "", css: "" }), [base, page]);
  const classes = React.useMemo(() => pageClasses(page), [page]);
  const [custom, setCustom] = React.useState(page.customCss ?? "");
  const [copied, setCopied] = React.useState(false);
  const editor = React.useRef<CodeEditorHandle | null>(null);

  // Custom CSS saves after a pause in typing, so undo steps are whole edits rather than keystrokes.
  React.useEffect(() => { setCustom(page.customCss ?? ""); }, [page.id]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  React.useEffect(() => {
    if (custom === (page.customCss ?? "")) return;
    const t = setTimeout(() => actions.updatePage(page.id, { customCss: custom }), 500);
    return () => clearTimeout(t);
  }, [custom, page.id, page.customCss, actions]);
  const saved = custom === (page.customCss ?? "");

  const f = files.find((x) => x.id === file) ?? files[0];
  const text = file === "html" ? code.html : file === "css" ? code.css : custom;
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } };
  const download = () => save(new Blob([text], { type: f.language === "html" ? "text/html" : "text/css" }), f.name);
  const downloadAll = () => {
    // The downloaded copy points its images at the live site, so it shows them when opened from disk.
    const out = base ? exportPage(base, page, window.location.origin) : code;
    save(zipFiles([{ name: "index.html", text: out.html }, { name: "styles.css", text: out.css }, ...(custom.trim() ? [{ name: "custom.css", text: custom }] : [])]), `${page.slug || "home"}.zip`);
  };
  const insertRule = (c: string) => {
    if (file !== "custom") onFile("custom");
    // After the switch the editor remounts; insert once it's there.
    // The cursor lands inside the new rule, ready to type.
    const rule = `${custom && !custom.endsWith("\n") ? "\n" : ""}.${c} {\n  `;
    setTimeout(() => editor.current?.append(`${rule}\n}\n`, rule.length), file === "custom" ? 0 : 60);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <h1 className="sr-only">Code for {page.name}</h1>
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-sunken/60 px-2 pt-2">
        <div role="tablist" aria-label="Files" className="flex min-w-0 flex-wrap items-end gap-1">
          {files.map((x) => {
            const on = x.id === file;
            const FIcon = x.icon;
            return (
              <button key={x.id} type="button" role="tab" aria-selected={on} onClick={() => onFile(x.id)}
                className={cx("relative inline-flex h-9 items-center gap-2 rounded-t-lg border border-b-0 px-3 text-label-sm transition-colors duration-fast",
                  on ? "-mb-px border-line bg-surface text-ink" : "border-transparent text-ink-muted hover:bg-surface-hover hover:text-ink")}>
                <FIcon className={cx("size-4", x.tone)} aria-hidden="true" />{x.name}
                {x.id === "custom" ? <PencilLine className="size-3 text-ink-subtle" aria-label="editable" /> : <Lock className="size-3 text-ink-subtle" aria-label="read only" />}
              </button>
            );
          })}
        </div>
        <div className="mb-1.5 ml-auto flex flex-wrap items-center gap-1">
          {file === "custom" && (
            <span className="mr-1 inline-flex items-center gap-1.5 text-caption text-ink-subtle" role="status" aria-live="polite">
              <CloudCheck className={cx("size-3.5", saved ? "text-success" : "text-ink-subtle")} aria-hidden="true" />{saved ? "Saved with the page" : "Saving…"}
            </span>
          )}
          <Button size="sm" variant="ghost" iconStart={copied ? <Check /> : <Copy />} onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
          <Button size="sm" variant="ghost" iconStart={<Download />} onClick={download}>{f.name}</Button>
          <Button size="sm" variant="secondary" iconStart={<FileArchive />} onClick={downloadAll}>Download .zip</Button>
        </div>
      </div>
      <div className="grid gap-2 border-b border-line px-3 py-2">
        <p className="text-body-sm text-ink-muted">{f.note}</p>
        {file === "custom" && classes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-label-sm text-ink-subtle">Classes on this page</span>
            {classes.map((c) => (
              <button key={c} type="button" onClick={() => insertRule(c)} title={`Add a rule for .${c}`}
                className="inline-flex h-7 items-center rounded-full border border-line bg-surface px-2.5 font-mono text-data-sm text-ink hover:border-info hover:text-info">.{c}</button>
            ))}
          </div>
        )}
      </div>
      <CodeEditor key={`${page.id}-${file}`} handleRef={editor} className="min-h-0 flex-1 overflow-hidden" label={`${f.name}, ${page.name}`} language={f.language} value={text}
        onChange={file === "custom" ? setCustom : undefined} completions={file === "custom" ? classes : undefined} placeholder={file === "custom" ? starter : undefined} />
    </div>
  );
}
