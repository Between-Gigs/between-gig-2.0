"use client";
import { Button, Field as FormField, Input, Modal, Select, cx } from "@ds/components";
import * as React from "react";
import { fieldTypes, viewTypes } from "@/lib/studio/query";
import { useStudio } from "@/lib/studio/store";
import type { CollectionIcon, FieldType, ViewType } from "@/lib/studio/types";
import { useUi } from "./context";
import { collectionIcons, fieldIcons, viewIcons } from "./ui";

/** A grid of big, labelled choices: the no-code way to pick a type. */
function TypeCards<T extends string>({ label, items, value, onChange, icons, columns = "sm:grid-cols-2" }: {
  label: string; items: { type: T; label: string; hint: string }[]; value: T; onChange: (t: T) => void; icons: Record<string, React.ComponentType<{ className?: string }>>; columns?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("grid gap-2", columns)}>
      {items.map((t) => {
        const Icon: React.ComponentType<{ className?: string }> = icons[t.type];
        const on = value === t.type;
        return (
          <button key={t.type} type="button" role="radio" aria-checked={on} onClick={() => onChange(t.type)}
            className={cx("flex items-start gap-3 rounded-md border p-3 text-left transition-colors duration-fast", on ? "border-action bg-surface-selected" : "border-line hover:bg-surface-hover")}>
            <span className={cx("inline-flex size-8 shrink-0 items-center justify-center rounded-sm", on ? "bg-action text-on-action" : "bg-surface-sunken text-ink-muted")}><Icon className="size-4" /></span>
            <span className="grid gap-0.5">
              <span className="text-label-md text-ink">{t.label}</span>
              <span className="text-body-sm text-ink-muted">{t.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AddFieldDialog() {
  const { actions, base } = useStudio();
  const ui = useUi();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<FieldType>("text");
  const [target, setTarget] = React.useState("");
  const others = base?.collections.filter((c) => c.id !== ui.collection.id) ?? [];
  React.useEffect(() => { if (ui.addFieldOpen) { setName(""); setType("text"); setTarget(others[0]?.id ?? ""); } }, [ui.addFieldOpen]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  const label = name.trim() || fieldTypes.find((t) => t.type === type)?.label || "Field";
  const save = () => {
    const id = actions.addField(ui.collection.id, { name: label, type, choices: type === "select" || type === "multiSelect" ? [] : undefined, linkTable: type === "link" ? target : undefined });
    ui.setAddFieldOpen(false);
    ui.inspect("field", id);
  };
  return (
    <Modal open={ui.addFieldOpen} onClose={() => ui.setAddFieldOpen(false)} size="lg" title="Add a field" description={`Fields are the details every record in ${ui.collection.name} can have.`}
      footer={<><Button variant="ghost" onClick={() => ui.setAddFieldOpen(false)}>Cancel</Button><Button variant="primary" onClick={save} disabled={type === "link" && !target}>Add field</Button></>}>
      <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <FormField label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={label} autoFocus /></FormField>
        <div className="grid gap-2">
          <span className="text-label-md text-ink">Type</span>
          <TypeCards label="Field type" items={fieldTypes} value={type} onChange={setType} icons={fieldIcons} columns="sm:grid-cols-2 lg:grid-cols-3" />
        </div>
        {type === "link" && (
          <FormField label="Links to">
            <Select value={target} onValueChange={setTarget} options={others.map((c) => ({ value: c.id, label: c.name }))} aria-label="Links to" />
          </FormField>
        )}
      </form>
    </Modal>
  );
}

export function AddViewDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actions } = useStudio();
  const ui = useUi();
  const [type, setType] = React.useState<ViewType>("gallery");
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Add a view" description="A view is another way to look at the same records. Changes in one show in all of them."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { const id = actions.addView(ui.collection.id, type); ui.open(ui.collection.id, id); ui.inspect("view"); onClose(); }}>Add view</Button></>}>
      <TypeCards label="View type" items={viewTypes} value={type} onChange={setType} icons={viewIcons} />
    </Modal>
  );
}

const icons: CollectionIcon[] = ["folder", "users", "book", "image", "tag", "inbox", "calendar", "star", "sparkles"];
const templates = [
  { type: "blank" as const, label: "Blank", hint: "A name and notes; add what you need" },
  { type: "content" as const, label: "Content", hint: "Title, cover, status, date and body, for posts and pages" },
  { type: "people" as const, label: "People", hint: "Name, photo, role, email and phone" },
];

export function NewCollectionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actions } = useStudio();
  const ui = useUi();
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState<CollectionIcon>("folder");
  const [template, setTemplate] = React.useState<"blank" | "content" | "people">("content");
  React.useEffect(() => { if (open) { setName(""); setIcon("folder"); setTemplate("content"); } }, [open]); // eslint-disable-line react-hooks/set-state-in-effect
  const save = () => { const id = actions.addCollection(name.trim() || "Untitled collection", icon, template); ui.open(id); onClose(); };
  return (
    <Modal open={open} onClose={onClose} size="lg" title="New collection" description="A collection holds one kind of thing: articles, people, events, products."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Create collection</Button></>}>
      <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <FormField label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Events" autoFocus /></FormField>
        <div className="grid gap-2">
          <span className="text-label-md text-ink">Icon</span>
          <div role="radiogroup" aria-label="Icon" className="flex flex-wrap gap-1.5">
            {icons.map((i) => { const Icon = collectionIcons[i]; return (
              <button key={i} type="button" role="radio" aria-checked={icon === i} aria-label={i} onClick={() => setIcon(i)}
                className={cx("inline-flex size-10 items-center justify-center rounded-md border", icon === i ? "border-action bg-surface-selected text-ink-brand" : "border-line text-ink-muted hover:bg-surface-hover")}>
                <Icon className="size-5" />
              </button>
            ); })}
          </div>
        </div>
        <div className="grid gap-2">
          <span className="text-label-md text-ink">Start from</span>
          <TypeCards label="Template" items={templates} value={template} onChange={setTemplate} icons={{ blank: collectionIcons.folder, content: collectionIcons.book, people: collectionIcons.users }} columns="sm:grid-cols-3" />
        </div>
      </form>
    </Modal>
  );
}
