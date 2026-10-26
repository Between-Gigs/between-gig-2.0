"use client";
/*
 * The Designer's Code tool: the page as code. index.html and styles.css are generated from the canvas (read-only, the
 * way a site builder exports); custom.css is yours, saved with the page and applied on the canvas and in the preview.
 */
import { Button, cx } from "@ds/components";
import { Check, Copy, Download, FileCode2, Lock, PencilLine } from "lucide-react";
import * as React from "react";
import { exportPage } from "@/lib/studio/export";
import { useStudio } from "@/lib/studio/store";
import type { Page } from "@/lib/studio/types";
import { CodeEditor, type CodeLanguage } from "./CodeEditor";

type FileId = "html" | "css" | "custom";
const files: { id: FileId; name: string; language: CodeLanguage; note: string }[] = [
  { id: "html", name: "index.html", language: "html", note: "Generated from the canvas. Change it there; this updates as you go." },
  { id: "css", name: "styles.css", language: "css", note: "Every class, cascading desktop → tablet → phone. Generated from the Style panel." },
  { id: "custom", name: "custom.css", language: "css", note: "Yours: saved with the page and applied on the canvas and in the preview. Class selectors (.hero) match the classes you've used. Style-panel values win unless you add !important." },
];

export function PageCode({ page, file, onFile }: { page: Page; file: FileId; onFile: (f: FileId) => void }) {
  const { base, actions } = useStudio();
  const code = React.useMemo(() => (base ? exportPage(base, page) : { html: "", css: "" }), [base, page]);
  const [custom, setCustom] = React.useState(page.customCss ?? "");
  const [copied, setCopied] = React.useState(false);

  // Custom CSS saves after a pause in typing, so undo steps are whole edits rather than keystrokes.
  React.useEffect(() => { setCustom(page.customCss ?? ""); }, [page.id]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  React.useEffect(() => {
    if (custom === (page.customCss ?? "")) return;
    const t = setTimeout(() => actions.updatePage(page.id, { customCss: custom }), 500);
    return () => clearTimeout(t);
  }, [custom, page.id, page.customCss, actions]);

  const f = files.find((x) => x.id === file) ?? files[0];
  const text = file === "html" ? code.html : file === "css" ? code.css : custom;
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: f.language === "html" ? "text/html" : "text/css" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: f.name });
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <h1 className="sr-only">Code for {page.name}</h1>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-2 py-1.5">
        <div role="tablist" aria-label="Files" className="flex min-w-0 flex-wrap items-center gap-0.5">
          {files.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={x.id === file} onClick={() => onFile(x.id)}
              className={cx("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-label-sm transition-colors duration-fast",
                x.id === file ? "bg-surface-selected text-ink" : "text-ink-muted hover:bg-surface-hover hover:text-ink")}>
              {x.id === "custom" ? <PencilLine className="size-3.5" aria-hidden="true" /> : <Lock className="size-3.5" aria-hidden="true" />}{x.name}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" iconStart={copied ? <Check /> : <Copy />} onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
          <Button size="sm" variant="ghost" iconStart={<Download />} onClick={download}>Download</Button>
        </div>
      </div>
      <p className="flex items-start gap-2 border-b border-line bg-surface-sunken px-3 py-2 text-body-sm text-ink-muted">
        <FileCode2 className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />{f.note}
      </p>
      <CodeEditor key={`${page.id}-${file}`} className="min-h-0 flex-1 overflow-hidden" label={`${f.name}, ${page.name}`} language={f.language} value={text}
        onChange={file === "custom" ? setCustom : undefined} />
    </div>
  );
}
