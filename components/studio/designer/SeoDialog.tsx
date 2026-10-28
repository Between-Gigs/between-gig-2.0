"use client";
import { Button, Field, Input, Modal, Textarea, cx } from "@ds/components";
import { ImageOff } from "lucide-react";
import * as React from "react";
import { useStudio } from "@/lib/studio/store";
import type { Page } from "@/lib/studio/types";
import { useUi } from "../context";
import { Thumb } from "../ui";
import { studioAssets } from "../Navigator";

/*
 * Search and sharing for one page, like Webflow's and Framer's page settings: the title and description search engines
 * and link previews show, and the image a shared link carries. Previews update as you type; the exported HTML gets
 * the tags (lib/studio/export.ts).
 */
export function SeoDialog({ page, open, onClose }: { page: Page; open: boolean; onClose: () => void }) {
  const ui = useUi();
  const { actions } = useStudio();
  const [title, setTitle] = React.useState(page.seo?.title ?? "");
  const [description, setDescription] = React.useState(page.seo?.description ?? "");
  const [image, setImage] = React.useState(page.seo?.image ?? "");
  React.useEffect(() => { if (open) { setTitle(page.seo?.title ?? ""); setDescription(page.seo?.description ?? ""); setImage(page.seo?.image ?? ""); } }, [open, page]); // eslint-disable-line react-hooks/set-state-in-effect
  const images = studioAssets(ui.base);
  const shownTitle = title.trim() || `${page.name} · ${ui.base.name}`;
  const shownDesc = description.trim() || "Add a description so search results and shared links say what this page is.";
  const url = `between-gigs.com/${page.slug}`;
  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Search and sharing · ${page.name}`} description="What search engines and link previews show for this page."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { actions.updatePage(page.id, { seo: { title: title.trim(), description: description.trim(), image } }); onClose(); }}>Save settings</Button></>}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid content-start gap-4">
          <Field label="Title" optional hint={`${title.length}/60 · shown in the browser tab and search results`}><Input value={title} maxLength={70} placeholder={`${page.name} · ${ui.base.name}`} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Description" optional hint={`${description.length}/160`}><Textarea rows={3} maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-label-md text-ink">Share image <span className="font-normal text-ink-subtle">· from your assets</span></legend>
            <div className="grid grid-cols-4 gap-2">
              <button type="button" aria-pressed={!image} onClick={() => setImage("")} className={cx("grid aspect-video place-items-center rounded-md border-2 text-ink-subtle", !image ? "border-ink-brand" : "border-line hover:border-line-strong")}><ImageOff className="size-4" aria-hidden="true" /><span className="sr-only">No image</span></button>
              {images.slice(0, 11).map((src) => (
                <button key={src} type="button" aria-pressed={image === src} aria-label={`Use ${src.split("/").pop()}`} onClick={() => setImage(src)}
                  className={cx("overflow-hidden rounded-md border-2", image === src ? "border-ink-brand" : "border-transparent hover:border-line-strong")}>
                  <Thumb src={src} className="aspect-video w-full" />
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="grid content-start gap-4">
          <section aria-label="Search result preview" className="grid gap-1 rounded-xl border border-line bg-surface p-4">
            <span className="text-caption text-ink-subtle">Search result</span>
            <span className="truncate text-body-sm text-ink-muted">{url}</span>
            <span className="line-clamp-1 text-heading-md text-link">{shownTitle}</span>
            <span className="line-clamp-2 text-body-sm text-ink-muted">{shownDesc}</span>
          </section>
          <section aria-label="Shared link preview" className="overflow-hidden rounded-xl border border-line bg-surface">
            {image ? <Thumb src={image} className="aspect-video w-full" /> : <div className="grid aspect-video place-items-center bg-surface-sunken text-body-sm text-ink-subtle">No share image</div>}
            <div className="grid gap-0.5 p-3">
              <span className="text-caption text-ink-subtle uppercase">between-gigs.com</span>
              <span className="line-clamp-1 text-label-md text-ink">{shownTitle}</span>
              <span className="line-clamp-2 text-body-sm text-ink-muted">{shownDesc}</span>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}
