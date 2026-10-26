"use client";
/*
 * A code editor (CodeMirror 6) dressed in the design system: token colours for the syntax, so it follows Day and
 * Night. Line numbers, folding, search (Ctrl/Cmd+F), bracket matching and the usual editing keys. Read-only unless
 * the caller hands it an onChange.
 */
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { HighlightStyle, bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { highlightSelectionMatches, search, searchKeymap } from "@codemirror/search";
import { EditorState, type Extension } from "@codemirror/state";
import {
  EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import * as React from "react";

export type CodeLanguage = "tsx" | "ts" | "js" | "css" | "html";

export const languageOf = (file: string): CodeLanguage =>
  file.endsWith(".tsx") ? "tsx" : file.endsWith(".ts") ? "ts" : /\.m?js$/.test(file) ? "js" : file.endsWith(".css") ? "css" : "html";

const lang = (l: CodeLanguage): Extension =>
  l === "css" ? css() : l === "html" ? html() : javascript({ typescript: l === "ts" || l === "tsx", jsx: l === "tsx" || l === "js" });

// The syntax in the system's accent colours.
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: "var(--cat-4)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--cat-2)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--cat-3)" },
  // Accent 1 is too light for text on the light surface; class and type names use brand ink.
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--ink-subtle)", fontStyle: "italic" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--ink-brand)", fontWeight: "600" },
  { tag: [t.tagName, t.angleBracket], color: "var(--cat-5)" },
  { tag: [t.attributeName, t.propertyName], color: "var(--link)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--cat-3)" },
  { tag: [t.definition(t.variableName)], color: "var(--ink)" },
  { tag: [t.punctuation, t.separator, t.bracket], color: "var(--ink-muted)" },
]);

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", backgroundColor: "var(--surface)", color: "var(--ink)" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6" },
  ".cm-content": { caretColor: "var(--ink)", padding: "12px 0" },
  ".cm-gutters": { backgroundColor: "var(--surface)", color: "var(--ink-subtle)", border: "none", borderRight: "1px solid var(--line)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--surface-selected) 45%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "color-mix(in oklab, var(--surface-selected) 45%, transparent)", color: "var(--ink)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": { backgroundColor: "color-mix(in oklab, var(--info) 28%, transparent) !important" },
  ".cm-cursor": { borderLeftColor: "var(--ink)" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in oklab, var(--success) 25%, transparent)", outline: "none" },
  ".cm-selectionMatch": { backgroundColor: "color-mix(in oklab, var(--warning) 22%, transparent)" },
  ".cm-searchMatch": { backgroundColor: "color-mix(in oklab, var(--warning) 35%, transparent)" },
  ".cm-panels": { backgroundColor: "var(--surface-sunken)", color: "var(--ink)", borderColor: "var(--line)" },
  ".cm-panel input, .cm-panel button": { fontFamily: "var(--font-sans)", fontSize: "13px" },
  ".cm-foldGutter span": { color: "var(--ink-subtle)" },
  "&.cm-focused": { outline: "none" },
});

export function CodeEditor({ value, language, onChange, label, className }: {
  value: string; language: CodeLanguage; onChange?: (value: string) => void; label: string; className?: string;
}) {
  const host = React.useRef<HTMLDivElement>(null);
  const view = React.useRef<EditorView | null>(null);
  const change = React.useRef(onChange);
  React.useEffect(() => { change.current = onChange; });
  const readOnly = !onChange;

  // One editor per language and mode; the text is swapped in below without rebuilding it.
  React.useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(), highlightActiveLineGutter(), foldGutter(), history(), drawSelection(), indentOnInput(), bracketMatching(),
          highlightActiveLine(), highlightSelectionMatches(), search({ top: true }), syntaxHighlighting(highlight), theme, lang(language),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...foldKeymap, indentWithTab]),
          EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly),
          EditorView.contentAttributes.of({ "aria-label": label, ...(readOnly ? { "aria-readonly": "true" } : {}) }),
          EditorView.updateListener.of((u) => { if (u.docChanged) change.current?.(u.state.doc.toString()); }),
        ],
      }),
    });
    // Read-only code still scrolls with the keyboard: the scroller takes focus.
    if (readOnly) { v.scrollDOM.tabIndex = 0; v.scrollDOM.setAttribute("aria-label", label); }
    view.current = v;
    return () => { v.destroy(); view.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the text follows in the next effect
  }, [language, readOnly, label]);

  React.useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={host} className={className} />;
}
