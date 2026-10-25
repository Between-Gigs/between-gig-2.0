"use client";
import { Input, Popover, Select, cx } from "@ds/components";
import {
  AlignCenter, AlignCenterVertical, AlignEndVertical, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignHorizontalJustifyStart,
  AlignHorizontalSpaceBetween, AlignLeft, AlignRight, AlignStartVertical, ArrowDown, ArrowRight, ChevronDown, ChevronRight, StretchHorizontal, X,
} from "lucide-react";
import * as React from "react";
import { breakpoints, elementName, fonts, resolveStyles, shadows, styleSource, tokenColors, walk } from "@/lib/studio/pages";
import { useStudio } from "@/lib/studio/store";
import type { PageElement } from "@/lib/studio/types";
import { useUi } from "../context";
import { ImagePicker } from "../cells";
import { useDesign } from "./context";

const unitless = new Set(["lineHeight", "fontWeight", "opacity", "gridColumns", "aspectRatio", "zIndex", "flexGrow"]);
const normalise = (prop: string, v: string) => (/^-?\d*\.?\d+$/.test(v.trim()) && !unitless.has(prop) ? `${v.trim()}px` : v.trim());

interface Ctl {
  el: PageElement;
  get: (prop: string) => string;
  set: (prop: string, value: string) => void;
  source: (prop: string) => "here" | "inherited" | "class" | "none";
}

/** A property name that says where its value comes from: blue when set at this breakpoint, amber when inherited. Click it to clear. */
function Label({ ctl, prop, children, className }: { ctl: Ctl; prop: string; children: React.ReactNode; className?: string }) {
  const s = ctl.source(prop);
  const cls = s === "here" ? "text-info" : s === "inherited" ? "text-warning" : "text-ink-muted";
  return s === "here"
    ? <button type="button" title="Set here. Click to clear." onClick={() => ctl.set(prop, "")} className={cx("text-left text-caption underline decoration-dotted underline-offset-2", cls, className)}>{children}</button>
    : <span className={cx("text-caption", cls, className)} title={s === "inherited" ? "Inherited from a larger breakpoint" : undefined}>{children}</span>;
}

/** A text field for one CSS value. Typing a plain number adds px where that makes sense. */
function Value({ ctl, prop, placeholder, className, label }: { ctl: Ctl; prop: string; placeholder?: string; className?: string; label: string }) {
  const v = ctl.get(prop);
  const [draft, setDraft] = React.useState(v);
  React.useEffect(() => setDraft(v), [v]); // eslint-disable-line react-hooks/set-state-in-effect
  const commit = () => { const n = normalise(prop, draft); if (n !== v) ctl.set(prop, n); };
  return (
    <input value={draft} placeholder={placeholder ?? "Auto"} aria-label={label} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        const m = /^(-?\d*\.?\d+)(.*)$/.exec(draft);
        if (m && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); const step = e.shiftKey ? 10 : 1; const n = `${Number(m[1]) + (e.key === "ArrowUp" ? step : -step)}${m[2] || (unitless.has(prop) ? "" : "px")}`; setDraft(n); ctl.set(prop, n); }
      }}
      className={cx("min-w-0 rounded-sm border bg-surface text-ink tabular-nums outline-none placeholder:text-ink-subtle focus-visible:border-focus", className ?? "h-8 w-full border-line px-2 text-body-sm")} />
  );
}

function Row({ ctl, prop, label, placeholder }: { ctl: Ctl; prop: string; label: string; placeholder?: string }) {
  return (
    <div className="grid grid-cols-5 items-center gap-2">
      <Label ctl={ctl} prop={prop} className="col-span-2">{label}</Label>
      <div className="col-span-3"><Value ctl={ctl} prop={prop} label={label} placeholder={placeholder} /></div>
    </div>
  );
}

/** Icon buttons for a set of values (display, direction, alignment). */
function Choice({ ctl, prop, label, options }: { ctl: Ctl; prop: string; label: string; options: { value: string; label: string; icon?: React.ReactNode }[] }) {
  const v = ctl.get(prop);
  return (
    <div className="grid grid-cols-5 items-center gap-2">
      <Label ctl={ctl} prop={prop} className="col-span-2">{label}</Label>
      <div role="radiogroup" aria-label={label} className="col-span-3 flex rounded-sm border border-line bg-surface-sunken p-0.5">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={v === o.value} title={o.label} aria-label={o.label} onClick={() => ctl.set(prop, v === o.value ? "" : o.value)}
            className={cx("inline-flex h-7 min-w-0 flex-1 items-center justify-center rounded-xs text-caption [&_svg]:size-3.5", v === o.value ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:text-ink")}>
            {o.icon ?? o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorRow({ ctl, prop, label }: { ctl: Ctl; prop: string; label: string }) {
  const v = ctl.get(prop);
  const token = v.startsWith("token:") ? tokenColors.find((t) => t.id === v.slice(6)) : undefined;
  const [hex, setHex] = React.useState("");
  return (
    <div className="grid grid-cols-5 items-center gap-2">
      <Label ctl={ctl} prop={prop} className="col-span-2">{label}</Label>
      <div className="col-span-3">
        <Popover label={label} width="sm" trigger={
          <button type="button" className="flex h-8 w-full items-center gap-2 rounded-sm border border-line bg-surface px-2 text-left text-body-sm text-ink">
            <span aria-hidden="true" className="size-4 shrink-0 rounded-xs border border-line" style={{ background: v ? (v.startsWith("token:") ? `var(--${v.slice(6)})` : v) : "transparent" }} />
            <span className="truncate">{token?.label ?? (v || "None")}</span>
          </button>}>
          <div className="grid gap-3">
            <div className="grid grid-cols-4 gap-1.5">
              {tokenColors.map((t) => (
                <button key={t.id} type="button" title={t.label} aria-label={t.label} aria-pressed={v === `token:${t.id}`} onClick={() => ctl.set(prop, `token:${t.id}`)}
                  className={cx("h-9 rounded-sm border border-line", v === `token:${t.id}` && "ring-2 ring-info ring-offset-2 ring-offset-surface-raised")} style={{ background: `var(--${t.id})` }} />
              ))}
            </div>
            <p className="text-caption text-ink-subtle">Brand colours follow Day and Night.</p>
            <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (hex.trim()) ctl.set(prop, hex.trim()); setHex(""); }}>
              <Input size="sm" className="min-w-0 flex-1" value={hex} onChange={(e) => setHex(e.target.value)} placeholder="Any CSS colour" aria-label="Custom colour" />
              <button type="submit" className="h-8 rounded-sm border border-line px-2 text-label-sm text-ink hover:bg-surface-hover">Use</button>
            </form>
            {v && <button type="button" onClick={() => ctl.set(prop, "")} className="justify-self-start text-label-sm text-link underline underline-offset-2">Clear</button>}
          </div>
        </Popover>
      </div>
    </div>
  );
}

function Group({ title, children, open: initial = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = React.useState(initial);
  const id = React.useId();
  return (
    <section className="border-b border-line">
      <h3>
        <button id={id} type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex h-10 w-full items-center gap-1.5 px-3 text-label-sm text-ink hover:bg-surface-hover">
          {open ? <ChevronDown className="size-3.5 text-ink-subtle" aria-hidden="true" /> : <ChevronRight className="size-3.5 text-ink-subtle" aria-hidden="true" />}{title}
        </button>
      </h3>
      {open && <div role="group" aria-labelledby={id} className="grid gap-2 px-3 pb-3">{children}</div>}
    </section>
  );
}

/** Margin outside, padding inside, like a site builder's box model. */
function SpacingBox({ ctl }: { ctl: Ctl }) {
  const cell = (prop: string, label: string) => (
    <div className="grid shrink-0 justify-items-center gap-0.5">
      <Value ctl={ctl} prop={prop} label={label} placeholder="0" className={cx("h-8 w-12 px-0.5 text-center text-caption", ctl.source(prop) === "here" ? "border-info text-info" : ctl.source(prop) === "inherited" ? "border-warning" : "border-line")} />
    </div>
  );
  return (
    <div className="grid gap-1 rounded-md border border-dashed border-line-strong p-2">
      <span className="text-caption text-ink-subtle">Margin</span>
      <div className="justify-self-center">{cell("marginTop", "Margin top")}</div>
      <div className="flex items-center gap-1">
        <div className="shrink-0">{cell("marginLeft", "Margin left")}</div>
        <div className="grid min-w-0 flex-1 gap-1 rounded-sm border border-line bg-surface-sunken p-2">
          <span className="text-caption text-ink-subtle">Padding</span>
          <div className="justify-self-center">{cell("paddingTop", "Padding top")}</div>
          <div className="flex items-center justify-between gap-1">{cell("paddingLeft", "Padding left")}<span className="h-6 flex-1 rounded-xs bg-surface" aria-hidden="true" />{cell("paddingRight", "Padding right")}</div>
          <div className="justify-self-center">{cell("paddingBottom", "Padding bottom")}</div>
        </div>
        <div className="shrink-0">{cell("marginRight", "Margin right")}</div>
      </div>
      <div className="justify-self-center">{cell("marginBottom", "Margin bottom")}</div>
    </div>
  );
}

function Selector({ el }: { el: PageElement }) {
  const ui = useUi();
  const d = useDesign();
  const { actions } = useStudio();
  const [q, setQ] = React.useState("");
  const uses = React.useMemo(() => {
    const n: Record<string, number> = {};
    for (const p of ui.base.pages) walk(p.root, (x) => { if (x.cls) n[x.cls] = (n[x.cls] ?? 0) + 1; });
    return n;
  }, [ui.base]);
  const names = Object.keys(ui.base.classes).sort();
  const name = q.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
  const matches = name ? names.filter((c) => c.includes(name) && c !== el.cls).slice(0, 6) : [];
  const apply = (c: string) => { actions.setClass(d.page.id, el.id, c); setQ(""); };
  return (
    <div role="group" aria-labelledby="selector-h" className="grid gap-2 border-b border-line p-3">
      <div className="flex items-center justify-between">
        <span id="selector-h" className="text-label-sm text-ink">Selector</span>
        <span className="text-caption text-ink-subtle">{elementName(el)}</span>
      </div>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-sm border border-line bg-surface p-1">
        {el.cls && (
          <span className="inline-flex h-7 items-center gap-1 rounded-xs bg-info pr-1 pl-2 text-label-sm text-bg">
            .{el.cls}
            <button type="button" aria-label={`Remove the class ${el.cls}`} onClick={() => actions.setClass(d.page.id, el.id, undefined)} className="inline-flex size-5 items-center justify-center rounded-xs hover:bg-bg/20"><X className="size-3" /></button>
          </span>
        )}
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Class name" placeholder={el.cls ? "Swap class" : "Add a class"}
          onKeyDown={(e) => { if (e.key === "Enter" && name) { e.preventDefault(); apply(name); } }}
          className="h-8 min-w-24 flex-1 bg-transparent px-1 text-body-sm text-ink outline-none placeholder:text-ink-subtle" />
      </div>
      {name && (
        <ul className="grid gap-0.5 rounded-sm border border-line bg-surface-raised p-1">
          {matches.map((c) => <li key={c}><button type="button" onClick={() => apply(c)} className="flex h-8 w-full items-center justify-between rounded-xs px-2 text-body-sm text-ink hover:bg-surface-hover">.{c}<span className="text-caption text-ink-subtle">{uses[c] ?? 0} uses</span></button></li>)}
          {!names.includes(name) && <li><button type="button" onClick={() => apply(name)} className="flex h-8 w-full items-center rounded-xs px-2 text-body-sm text-ink hover:bg-surface-hover">Create .{name}</button></li>}
        </ul>
      )}
      <p className="text-body-sm text-ink-subtle">
        {el.cls ? `Styling .${el.cls}: ${uses[el.cls] ?? 1} element${(uses[el.cls] ?? 1) === 1 ? "" : "s"} share it.` : "No class: styles apply to this element only. Add a class to reuse them."}
        {" "}{d.bp === "base" ? "Desktop styles cascade to tablet and phone." : `${breakpoints.find((b) => b.id === d.bp)?.label} overrides Desktop.`}
      </p>
    </div>
  );
}

export function StylePanel() {
  const ui = useUi();
  const d = useDesign();
  const { actions } = useStudio();
  const el = d.selectedId ? (() => { let f: PageElement | null = null; walk(d.page.root, (x) => { if (x.id === d.selectedId) f = x; }); return f as PageElement | null; })() : null;
  if (!el) return <p className="p-5 text-body-sm text-ink-muted">Select an element on the canvas or in the Navigator to style it.</p>;
  const resolved = resolveStyles(el, ui.base.classes, d.bp);
  const ctl: Ctl = {
    el,
    get: (p) => resolved[p] ?? "",
    set: (p, v) => actions.setStyle(d.page.id, el.id, d.bp, p, v),
    source: (p) => styleSource(el, ui.base.classes, d.bp, p),
  };
  const display = resolved.display ?? (["section", "container", "div", "body", "item", "heading", "paragraph", "text", "divider", "image"].includes(el.type) ? "block" : "inline");
  const textual = ["heading", "paragraph", "text", "link", "button", "body", "section", "container", "div", "item", "columns"].includes(el.type);
  return (
    <div>
      <Selector el={el} />
      <Group title="Layout">
        <Choice ctl={ctl} prop="display" label="Display" options={[{ value: "block", label: "Block" }, { value: "flex", label: "Flex" }, { value: "grid", label: "Grid" }, { value: "none", label: "None" }]} />
        {display === "flex" && (
          <>
            <Choice ctl={ctl} prop="flexDirection" label="Direction" options={[{ value: "row", label: "Horizontal", icon: <ArrowRight /> }, { value: "column", label: "Vertical", icon: <ArrowDown /> }]} />
            <Choice ctl={ctl} prop="alignItems" label="Align" options={[{ value: "flex-start", label: "Start", icon: <AlignStartVertical /> }, { value: "center", label: "Centre", icon: <AlignCenterVertical /> }, { value: "flex-end", label: "End", icon: <AlignEndVertical /> }, { value: "stretch", label: "Stretch", icon: <StretchHorizontal /> }]} />
            <Choice ctl={ctl} prop="justifyContent" label="Justify" options={[{ value: "flex-start", label: "Start", icon: <AlignHorizontalJustifyStart /> }, { value: "center", label: "Centre", icon: <AlignHorizontalJustifyCenter /> }, { value: "flex-end", label: "End", icon: <AlignHorizontalJustifyEnd /> }, { value: "space-between", label: "Space between", icon: <AlignHorizontalSpaceBetween /> }]} />
            <Choice ctl={ctl} prop="flexWrap" label="Wrap" options={[{ value: "nowrap", label: "Don't wrap" }, { value: "wrap", label: "Wrap" }]} />
            <Row ctl={ctl} prop="gap" label="Gap" placeholder="0" />
          </>
        )}
        {display === "grid" && (
          <>
            <Row ctl={ctl} prop="gridColumns" label="Columns" placeholder="1" />
            <Row ctl={ctl} prop="gap" label="Gap" placeholder="0" />
            <Choice ctl={ctl} prop="alignItems" label="Align" options={[{ value: "start", label: "Start", icon: <AlignStartVertical /> }, { value: "center", label: "Centre", icon: <AlignCenterVertical /> }, { value: "end", label: "End", icon: <AlignEndVertical /> }, { value: "stretch", label: "Stretch", icon: <StretchHorizontal /> }]} />
          </>
        )}
      </Group>
      <Group title="Spacing"><SpacingBox ctl={ctl} /></Group>
      <Group title="Size">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {([["width", "Width"], ["height", "Height"], ["minHeight", "Min H"], ["maxWidth", "Max W"]] as const).map(([p, l]) => (
            <label key={p} className="grid gap-1"><Label ctl={ctl} prop={p}>{l}</Label><Value ctl={ctl} prop={p} label={l} /></label>
          ))}
        </div>
        {el.type === "image" && <Choice ctl={ctl} prop="objectFit" label="Fit" options={[{ value: "cover", label: "Fill" }, { value: "contain", label: "Fit" }]} />}
        {el.type === "image" && <Row ctl={ctl} prop="aspectRatio" label="Ratio" placeholder="Auto (e.g. 4 / 3)" />}
      </Group>
      {textual && (
        <Group title="Typography">
          <div className="grid grid-cols-5 items-center gap-2">
            <Label ctl={ctl} prop="fontFamily" className="col-span-2">Font</Label>
            <Select size="sm" className="col-span-3" value={ctl.get("fontFamily")} placeholder="Inherit" aria-label="Font" onValueChange={(v) => ctl.set("fontFamily", v)} options={[{ value: "", label: "Inherit" }, ...fonts.map((f) => ({ value: f.id, label: f.label }))]} />
          </div>
          <div className="grid grid-cols-5 items-center gap-2">
            <Label ctl={ctl} prop="fontWeight" className="col-span-2">Weight</Label>
            <Select size="sm" className="col-span-3" value={ctl.get("fontWeight")} placeholder="Inherit" aria-label="Weight" onValueChange={(v) => ctl.set("fontWeight", v)}
              options={[{ value: "", label: "Inherit" }, { value: "400", label: "400 Regular" }, { value: "500", label: "500 Medium" }, { value: "600", label: "600 Semibold" }, { value: "700", label: "700 Bold" }, { value: "800", label: "800 Extra bold" }]} />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {([["fontSize", "Size"], ["lineHeight", "Height"], ["letterSpacing", "Spacing"]] as const).map(([p, l]) => (
              <label key={p} className="grid gap-1"><Label ctl={ctl} prop={p}>{l}</Label><Value ctl={ctl} prop={p} label={`Font ${l.toLowerCase()}`} placeholder="Inherit" /></label>
            ))}
          </div>
          <ColorRow ctl={ctl} prop="color" label="Colour" />
          <Choice ctl={ctl} prop="textAlign" label="Align" options={[{ value: "left", label: "Left", icon: <AlignLeft /> }, { value: "center", label: "Centre", icon: <AlignCenter /> }, { value: "right", label: "Right", icon: <AlignRight /> }]} />
          <Choice ctl={ctl} prop="textTransform" label="Case" options={[{ value: "none", label: "Aa" }, { value: "uppercase", label: "AA" }, { value: "lowercase", label: "aa" }]} />
        </Group>
      )}
      <Group title="Backgrounds">
        <ColorRow ctl={ctl} prop="backgroundColor" label="Colour" />
        <div className="grid grid-cols-5 items-center gap-2">
          <Label ctl={ctl} prop="backgroundImage" className="col-span-2">Image</Label>
          <div className="col-span-3">
            <Popover label="Background image" width="md" trigger={<button type="button" className="flex h-8 w-full items-center rounded-sm border border-line bg-surface px-2 text-left text-body-sm text-ink"><span className="truncate">{ctl.get("backgroundImage") ? ctl.get("backgroundImage").split("/").pop() : "None"}</span></button>}>
              <ImagePicker base={ui.base} value={ctl.get("backgroundImage") || null} onChange={(v) => { ctl.set("backgroundImage", typeof v === "string" ? v : ""); if (v) { ctl.set("backgroundSize", "cover"); ctl.set("backgroundPosition", "center"); } }} />
            </Popover>
          </div>
        </div>
      </Group>
      <Group title="Borders" open={false}>
        <Row ctl={ctl} prop="borderRadius" label="Radius" placeholder="0" />
        <Row ctl={ctl} prop="borderWidth" label="Width" placeholder="0" />
        <ColorRow ctl={ctl} prop="borderColor" label="Colour" />
      </Group>
      <Group title="Effects" open={false}>
        <Row ctl={ctl} prop="opacity" label="Opacity" placeholder="1" />
        <div className="grid grid-cols-5 items-center gap-2">
          <Label ctl={ctl} prop="boxShadow" className="col-span-2">Shadow</Label>
          <Select size="sm" className="col-span-3" value={ctl.get("boxShadow").replace("token:", "")} aria-label="Shadow" onValueChange={(v) => ctl.set("boxShadow", v ? `token:${v}` : "")} options={shadows.map((s) => ({ value: s.id, label: s.label }))} />
        </div>
      </Group>
    </div>
  );
}
