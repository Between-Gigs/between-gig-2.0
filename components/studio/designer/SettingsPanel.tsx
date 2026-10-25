"use client";
import { Button, Input, Popover, Select, Switch, Textarea, useToast } from "@ds/components";
import { ArrowDown, ArrowUp, Copy, Database, Trash2 } from "lucide-react";
import * as React from "react";
import { elementInfo, elementName, findEl, findParent, pathTo, stepMove } from "@/lib/studio/pages";
import { useStudio } from "@/lib/studio/store";
import type { FieldType, PageElement } from "@/lib/studio/types";
import { ImagePicker } from "../cells";
import { useUi } from "../context";
import { Thumb } from "../ui";
import { useDesign } from "./context";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-b border-line p-3">
      <h3 className="text-label-sm text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Labelled({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-caption text-ink-muted">{label}</span>
      {children}
      {hint && <span className="text-caption text-ink-subtle">{hint}</span>}
    </label>
  );
}

/** A text field that saves when you leave it, as one undo step. */
function Text({ value, onSave, multiline, placeholder, label }: { value: string; onSave: (v: string) => void; multiline?: boolean; placeholder?: string; label: string }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]); // eslint-disable-line react-hooks/set-state-in-effect
  const save = () => { if (draft !== value) onSave(draft); };
  return multiline
    ? <Textarea rows={4} value={draft} aria-label={label} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={save} />
    : <Input size="sm" value={draft} aria-label={label} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={save} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />;
}

const bindable: Record<string, FieldType[]> = {
  heading: ["text", "longText", "number", "currency", "select", "multiSelect", "date", "email", "url", "rating", "link"],
  paragraph: ["text", "longText", "number", "currency", "select", "multiSelect", "date", "email", "url", "link"],
  text: ["text", "longText", "number", "currency", "select", "multiSelect", "date", "email", "url", "rating", "link"],
  link: ["url", "text", "email"], button: ["url", "text"], image: ["image"],
};

export function SettingsPanel() {
  const ui = useUi();
  const d = useDesign();
  const { actions } = useStudio();
  const toast = useToast();
  const el = d.selectedId ? findEl(d.page.root, d.selectedId) : null;
  if (!el) return <p className="p-5 text-body-sm text-ink-muted">Select an element to change its content and settings.</p>;
  const set = (patch: Partial<PageElement>, label?: string) => actions.updateElement(d.page.id, el.id, patch, label);
  const list = pathTo(d.page.root, el.id).reverse().find((x) => x.type === "collection" && x.id !== el.id);
  const coll = list?.source ? ui.base.collections.find((c) => c.id === list.source!.collectionId) : undefined;
  const fields = coll && bindable[el.type] ? coll.fields.filter((f) => bindable[el.type].includes(f.type)) : [];
  const bound = el.bind ? coll?.fields.find((f) => f.id === el.bind) : undefined;
  // A Collection Item edits its list's settings too: that's what people look for after clicking a card.
  const listEl = el.type === "collection" ? el : el.type === "item" ? findParent(d.page.root, el.id)?.parent ?? null : null;
  const setList = (patch: Partial<PageElement>, label?: string) => { if (listEl) actions.updateElement(d.page.id, listEl.id, patch, label); };
  const src = listEl?.source;
  const source = src ? ui.base.collections.find((c) => c.id === src.collectionId) : undefined;
  const filterable = source?.fields.filter((f) => f.type === "select" || f.type === "checkbox") ?? [];
  const filterField = src?.filterField ? source?.fields.find((f) => f.id === src.filterField) : undefined;

  return (
    <div>
      <Section title={`${elementName(el)} settings`}>
        <Labelled label="Name in the Navigator"><Text label="Name" value={el.label ?? ""} placeholder={elementInfo[el.type].label} onSave={(v) => set({ label: v.trim() || undefined }, "Renamed an element")} /></Labelled>
        {el.type === "heading" && (
          <Labelled label="Level">
            <Select size="sm" value={String(el.level ?? 2)} aria-label="Heading level" onValueChange={(v) => set({ level: Number(v) })} options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `H${n}${n === 1 ? " · one per page" : ""}` }))} />
          </Labelled>
        )}
      </Section>

      {coll && fields.length > 0 && (
        <Section title="Get content from the CMS">
          <Labelled label={`Field in ${coll.name}`} hint={bound ? "Each item shows its own value." : "Pick a field to fill this from each item."}>
            <Select size="sm" value={el.bind ?? ""} aria-label="Bound field" onValueChange={(v) => set({ bind: v || undefined }, v ? "Connected a field" : "Disconnected a field")}
              options={[{ value: "", label: "Not connected" }, ...fields.map((f) => ({ value: f.id, label: f.name }))]} />
          </Labelled>
        </Section>
      )}

      {["heading", "paragraph", "text", "link", "button"].includes(el.type) && !(bound && el.type !== "link" && el.type !== "button") && (
        <Section title="Content">
          <Labelled label="Text" hint="Or double-click the text on the canvas."><Text label="Text" multiline={el.type === "paragraph"} value={el.text ?? ""} onSave={(v) => set({ text: v }, "Edited text")} /></Labelled>
        </Section>
      )}

      {(el.type === "link" || el.type === "button") && !(bound?.type === "url") && (
        <Section title="Link">
          <Labelled label="Goes to" hint="A page, a section (#id) or a full web address.">
            <Text label="Link address" value={el.href ?? ""} placeholder="https://" onSave={(v) => set({ href: v.trim() })} />
          </Labelled>
          <div className="flex flex-wrap gap-1.5">
            {ui.base.pages.map((p) => <button key={p.id} type="button" onClick={() => set({ href: `/${p.slug}` })} className="inline-flex h-7 items-center rounded-full border border-line px-2.5 text-label-sm text-ink hover:bg-surface-hover">{p.name}</button>)}
          </div>
          <Switch checked={!!el.newTab} onChange={(v) => set({ newTab: v })} label="Open in a new tab" />
        </Section>
      )}

      {el.type === "image" && !bound && (
        <Section title="Image">
          <div className="flex items-center gap-3">
            <Thumb src={el.src || null} className="size-16 rounded-md" />
            <Popover label="Choose image" width="md" trigger={<Button size="sm" variant="secondary">{el.src ? "Replace" : "Choose image"}</Button>}>
              <ImagePicker base={ui.base} value={el.src ?? null} onChange={(v) => set({ src: typeof v === "string" ? v : "" }, "Changed an image")} />
            </Popover>
          </div>
          <Labelled label="Alt text" hint="Describes the picture for screen readers. Leave empty if it's decorative."><Text label="Alt text" value={el.alt ?? ""} onSave={(v) => set({ alt: v })} /></Labelled>
        </Section>
      )}

      {listEl && (
        <Section title={el.type === "item" ? "Collection List (this item's list)" : "Collection list"}>
          {el.type === "item" && <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => d.select(listEl.id)}>Select the Collection List</Button>}
          <Labelled label="Get items from">
            <Select size="sm" value={src?.collectionId ?? ""} aria-label="Collection" onValueChange={(id) => setList({ source: { collectionId: id, limit: src?.limit ?? 6 } }, "Changed the list's collection")}
              options={ui.base.collections.map((c) => ({ value: c.id, label: c.name }))} />
          </Labelled>
          <Labelled label="Show up to"><Text label="Limit" value={String(src?.limit ?? 6)} onSave={(v) => setList({ source: { ...src!, limit: Math.max(1, Math.min(100, Number(v) || 1)) } })} /></Labelled>
          {source && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Labelled label="Sort by">
                  <Select size="sm" value={src?.sortField ?? ""} aria-label="Sort by" onValueChange={(v) => setList({ source: { ...src!, sortField: v || undefined } })} options={[{ value: "", label: "Collection order" }, ...source.fields.map((f) => ({ value: f.id, label: f.name }))]} />
                </Labelled>
                <Labelled label="Order">
                  <Select size="sm" value={src?.sortDir ?? "asc"} aria-label="Order" onValueChange={(v) => setList({ source: { ...src!, sortDir: v as "asc" | "desc" } })} options={[{ value: "asc", label: "A → Z" }, { value: "desc", label: "Z → A" }]} />
                </Labelled>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Labelled label="Only show where">
                  <Select size="sm" value={src?.filterField ?? ""} aria-label="Filter field" onValueChange={(v) => setList({ source: { ...src!, filterField: v || undefined, filterValue: undefined } })} options={[{ value: "", label: "Show all" }, ...filterable.map((f) => ({ value: f.id, label: f.name }))]} />
                </Labelled>
                {filterField && (
                  <Labelled label="is">
                    <Select size="sm" value={src?.filterValue ?? ""} placeholder="Choose…" aria-label="Filter value" onValueChange={(v) => setList({ source: { ...src!, filterValue: v } })}
                      options={filterField.type === "checkbox" ? [{ value: "true", label: "Checked" }] : (filterField.choices ?? []).map((o) => ({ value: o.id, label: o.label }))} />
                  </Labelled>
                )}
              </div>
              <Button size="sm" variant="ghost" iconStart={<Database />} className="justify-self-start" onClick={() => { ui.open(source.id); d.openCms(); }}>Edit {source.name} in the CMS</Button>
            </>
          )}
          <p className="text-caption text-ink-subtle">Select the first item on the canvas to design every item. Connect its text and images to fields in Settings.</p>
        </Section>
      )}

      {el.type !== "body" && el.type !== "item" && (
        <section className="flex flex-wrap gap-2 p-3">
          {(() => {
            const up = stepMove(d.page.root, el.id, -1), down = stepMove(d.page.root, el.id, 1);
            return (
              <>
                <Button size="sm" variant="ghost" iconStart={<ArrowUp />} disabled={!up} title={up ? "Move up (Alt+↑)" : "Already first"} onClick={() => up && actions.moveElement(d.page.id, el.id, up.parentId, up.index)}>Move up</Button>
                <Button size="sm" variant="ghost" iconStart={<ArrowDown />} disabled={!down} title={down ? "Move down (Alt+↓)" : "Already last"} onClick={() => down && actions.moveElement(d.page.id, el.id, down.parentId, down.index)}>Move down</Button>
              </>
            );
          })()}
          <Button size="sm" variant="ghost" iconStart={<Copy />} onClick={() => { const id = actions.duplicateElement(d.page.id, el.id); if (id) d.select(id); }}>Duplicate</Button>
          <Button size="sm" variant="ghost" iconStart={<Trash2 />} className="text-danger" onClick={() => { const p = findParent(d.page.root, el.id)?.parent.id ?? null; actions.deleteElement(d.page.id, el.id); d.select(p); toast({ message: `Deleted ${elementName(el)}`, action: { label: "Undo", onClick: () => { actions.undo(); d.select(el.id); } } }); }}>Delete</Button>
        </section>
      )}
    </div>
  );
}
