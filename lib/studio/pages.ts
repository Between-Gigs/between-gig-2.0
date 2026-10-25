/*
 * The Designer's pages: a tree of elements styled like a site builder. Styles cascade from desktop (base) to tablet
 * to phone; a class's styles apply to every element that uses it, and an element's own styles sit on top.
 */
import type * as React from "react";
import { asset } from "@/lib/site";
import { uid } from "./query";
import type { Breakpoint, ElementType, Page, PageElement, StyleProps, Styles } from "./types";

export const breakpoints: { id: Breakpoint; label: string; width: number | null; hint: string }[] = [
  { id: "base", label: "Desktop", width: null, hint: "Base styles; tablet and phone inherit them" },
  { id: "tablet", label: "Tablet", width: 768, hint: "768px and below" },
  { id: "phone", label: "Phone", width: 390, hint: "478px and below" },
];
const order: Breakpoint[] = ["base", "tablet", "phone"];

export const elementInfo: Record<ElementType, { label: string; container: boolean; hint: string }> = {
  body: { label: "Body", container: true, hint: "The whole page" },
  section: { label: "Section", container: true, hint: "A full-width band of the page" },
  container: { label: "Container", container: true, hint: "Centres content at a readable width" },
  div: { label: "Div Block", container: true, hint: "A box to group and lay out elements" },
  columns: { label: "Columns", container: true, hint: "Side-by-side boxes on a grid" },
  heading: { label: "Heading", container: false, hint: "A title, H1 to H6" },
  paragraph: { label: "Paragraph", container: false, hint: "A block of running text" },
  text: { label: "Text Block", container: false, hint: "A short line of text" },
  link: { label: "Text Link", container: false, hint: "Words that go somewhere" },
  button: { label: "Button", container: false, hint: "A call to action" },
  image: { label: "Image", container: false, hint: "A photo or picture" },
  divider: { label: "Divider", container: false, hint: "A thin rule between things" },
  collection: { label: "Collection List", container: false, hint: "Repeats a design for each record in a collection" },
  item: { label: "Collection Item", container: true, hint: "The design repeated for each record" },
};

export const addable: { group: string; types: ElementType[] }[] = [
  { group: "Structure", types: ["section", "container", "div", "columns"] },
  { group: "Typography", types: ["heading", "paragraph", "text", "link"] },
  { group: "Basic", types: ["button", "image", "divider"] },
  { group: "CMS", types: ["collection"] },
];

export const elementName = (el: PageElement) => el.label ?? (el.type === "heading" ? `Heading ${el.level ?? 2}` : elementInfo[el.type].label);

/* Tree helpers. They work on drafts inside a store change, so they mutate. */

export function walk(el: PageElement, fn: (el: PageElement, parent: PageElement | null) => void, parent: PageElement | null = null) {
  fn(el, parent);
  for (const c of el.children ?? []) walk(c, fn, el);
}

export function findEl(root: PageElement, id: string): PageElement | null {
  let found: PageElement | null = null;
  walk(root, (el) => { if (!found && el.id === id) found = el; });
  return found;
}

export function findParent(root: PageElement, id: string): { parent: PageElement; index: number } | null {
  let out: { parent: PageElement; index: number } | null = null;
  walk(root, (el) => { const i = el.children?.findIndex((c) => c.id === id) ?? -1; if (!out && i >= 0) out = { parent: el, index: i }; });
  return out;
}

/** The chain from the body down to an element, for the breadcrumb. */
export function pathTo(root: PageElement, id: string): PageElement[] {
  const trail: PageElement[] = [];
  const go = (el: PageElement): boolean => {
    trail.push(el);
    if (el.id === id) return true;
    for (const c of el.children ?? []) if (go(c)) return true;
    trail.pop();
    return false;
  };
  return go(root) ? trail : [];
}

export const contains = (el: PageElement, id: string) => !!findEl(el, id);

/** Whether an element can hold another directly (collection lists only hold their item). */
export function accepts(parent: PageElement, child: PageElement) {
  if (!elementInfo[parent.type].container || child.type === "body" || child.type === "item") return false;
  return true;
}

export function removeEl(root: PageElement, id: string) {
  const at = findParent(root, id);
  if (at) at.parent.children!.splice(at.index, 1);
}

export function insertEl(root: PageElement, parentId: string, index: number, el: PageElement) {
  const parent = findEl(root, parentId);
  if (!parent) return;
  parent.children ??= [];
  parent.children.splice(Math.max(0, Math.min(index, parent.children.length)), 0, el);
}

/** Moves an element; refuses to put an element inside itself. */
export function moveEl(root: PageElement, id: string, parentId: string, index: number) {
  const el = findEl(root, id);
  const from = findParent(root, id);
  if (!el || !from || contains(el, parentId)) return;
  from.parent.children!.splice(from.index, 1);
  const adjusted = from.parent.id === parentId && from.index < index ? index - 1 : index;
  insertEl(root, parentId, adjusted, el);
}

export function cloneEl(el: PageElement): PageElement {
  return { ...structuredClone(el), id: uid("el"), children: el.children?.map(cloneEl) };
}

/* Styles. */

/** The styles an element shows at a breakpoint: its class, then its own, each cascading from desktop down. */
export function resolveStyles(el: PageElement, classes: Record<string, Styles>, bp: Breakpoint): StyleProps {
  const upTo = order.slice(0, order.indexOf(bp) + 1);
  const cls = el.cls ? classes[el.cls] : undefined;
  return Object.assign({}, ...upTo.map((b) => cls?.[b] ?? {}), ...upTo.map((b) => el.styles[b] ?? {}));
}

/** Where a property's value comes from, for the panel's coloured labels. */
export function styleSource(el: PageElement, classes: Record<string, Styles>, bp: Breakpoint, prop: string): "here" | "inherited" | "class" | "none" {
  const target = el.cls ? classes[el.cls] ?? {} : el.styles;
  if (target[bp]?.[prop] !== undefined) return "here";
  const upTo = order.slice(0, order.indexOf(bp));
  if (upTo.some((b) => target[b]?.[prop] !== undefined)) return "inherited";
  if (el.cls && order.slice(0, order.indexOf(bp) + 1).some((b) => el.styles[b]?.[prop] !== undefined)) return "here";
  return "none";
}

export const tokenColors = [
  { id: "bg", label: "Page" }, { id: "surface", label: "Surface" }, { id: "surface-sunken", label: "Sunken" }, { id: "surface-brand", label: "Brand surface" },
  { id: "ink", label: "Ink" }, { id: "ink-muted", label: "Muted ink" }, { id: "ink-brand", label: "Brand ink" }, { id: "ink-on-brand", label: "Ink on brand" },
  { id: "action", label: "Action" }, { id: "on-action", label: "On action" }, { id: "line", label: "Line" }, { id: "link", label: "Link" },
  { id: "cat-1", label: "Accent 1" }, { id: "cat-2", label: "Accent 2" }, { id: "cat-3", label: "Accent 3" }, { id: "cat-4", label: "Accent 4" },
];
export const fonts = [{ id: "display", label: "Display (Sora)" }, { id: "sans", label: "Body (Figtree)" }, { id: "serif", label: "Serif" }, { id: "mono", label: "Mono" }];
export const shadows = [{ id: "", label: "None" }, { id: "sm", label: "Small" }, { id: "md", label: "Medium" }, { id: "lg", label: "Large" }];

const color = (v: string) => (v.startsWith("token:") ? `var(--${v.slice(6)})` : v);

/** A style set as inline CSS for the canvas and the preview. */
export function toCss(p: StyleProps): React.CSSProperties {
  const css: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === "") continue;
    if (k === "gridColumns") css.gridTemplateColumns = `repeat(${Math.max(1, Number(v) || 1)}, minmax(0, 1fr))`;
    else if (k === "fontFamily") css.fontFamily = `var(--font-${v})`;
    else if (k === "boxShadow") css.boxShadow = v.startsWith("token:") ? `var(--elev-${v.slice(6)})` : v;
    else if (k === "backgroundImage") css.backgroundImage = `url("${asset(v)}")`;
    else if (k === "borderWidth") { css.borderWidth = v; css.borderStyle = "solid"; }
    else if (/color$/i.test(k)) css[k] = color(v);
    else css[k] = v;
  }
  return css as React.CSSProperties;
}

/* New elements, with sensible starting styles. */

export function newElement(type: ElementType): PageElement {
  const el = (t: ElementType, extra: Partial<PageElement> = {}, base: StyleProps = {}): PageElement => ({ id: uid("el"), type: t, styles: Object.keys(base).length ? { base } : {}, ...extra });
  switch (type) {
    case "section": return el("section", { children: [] }, { paddingTop: "80px", paddingBottom: "80px", paddingLeft: "24px", paddingRight: "24px" });
    case "container": return el("container", { children: [] }, { width: "100%", maxWidth: "1120px", marginLeft: "auto", marginRight: "auto" });
    case "div": return el("div", { children: [] });
    case "columns": return el("columns", { children: [el("div", { children: [] }), el("div", { children: [] })] }, { display: "grid", gridColumns: "2", gap: "24px" });
    case "heading": return el("heading", { text: "Heading", level: 2 }, { fontFamily: "display", fontSize: "36px", lineHeight: "1.15", fontWeight: "600" });
    case "paragraph": return el("paragraph", { text: "Write something here. Double-click to edit the text right on the canvas." }, { fontSize: "18px", lineHeight: "1.6", color: "token:ink-muted" });
    case "text": return el("text", { text: "Text block" });
    case "link": return el("link", { text: "Text link", href: "#" }, { color: "token:link", textDecoration: "underline" });
    case "button": return el("button", { text: "Button", href: "#" }, { display: "inline-block", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "20px", paddingRight: "20px", backgroundColor: "token:action", color: "token:on-action", borderRadius: "8px", fontWeight: "600", textDecoration: "none" });
    case "image": return el("image", { src: "", alt: "" }, { width: "100%", borderRadius: "12px", display: "block" });
    case "divider": return el("divider", {}, { height: "1px", backgroundColor: "token:line", marginTop: "24px", marginBottom: "24px" });
    case "collection": return el("collection", {
      source: { collectionId: "gigsters", limit: 6 },
      children: [el("item", { children: [
        el("image", { bind: "photo", alt: "" }, { width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: "12px", display: "block" }),
        el("heading", { level: 3, text: "Name", bind: "name" }, { fontFamily: "display", fontSize: "20px", marginTop: "12px" }),
        el("text", { text: "Details", bind: "position" }, { color: "token:ink-muted" }),
      ] })],
    }, { display: "grid", gridColumns: "3", gap: "24px" });
    case "item": return el("item", { children: [] });
    case "body": return el("body", { children: [] });
  }
}

/* The sample site: a Between Gigs home page and an About page, built from classes like a Webflow project. */

export function seedClasses(): Record<string, Styles> {
  return {
    page: { base: { backgroundColor: "token:bg", color: "token:ink", fontFamily: "sans", minHeight: "100%" } },
    section: { base: { paddingTop: "96px", paddingBottom: "96px", paddingLeft: "24px", paddingRight: "24px" }, phone: { paddingTop: "64px", paddingBottom: "64px" } },
    "section-alt": { base: { backgroundColor: "token:surface-sunken" } },
    container: { base: { width: "100%", maxWidth: "1120px", marginLeft: "auto", marginRight: "auto" } },
    hero: { base: { paddingTop: "128px", paddingBottom: "112px", paddingLeft: "24px", paddingRight: "24px", textAlign: "center", backgroundColor: "token:surface-brand", color: "token:ink-on-brand" }, phone: { paddingTop: "88px", paddingBottom: "72px", textAlign: "left" } },
    eyebrow: { base: { fontSize: "13px", fontWeight: "700", letterSpacing: "0.18em", textTransform: "uppercase", color: "token:ink-brand" } },
    "hero-title": { base: { fontFamily: "display", fontSize: "64px", lineHeight: "1.04", fontWeight: "600", marginTop: "16px", maxWidth: "820px", marginLeft: "auto", marginRight: "auto" }, tablet: { fontSize: "48px" }, phone: { fontSize: "36px" } },
    "hero-lead": { base: { fontSize: "20px", lineHeight: "1.6", marginTop: "20px", maxWidth: "620px", marginLeft: "auto", marginRight: "auto", opacity: "0.85" }, phone: { fontSize: "17px" } },
    "button-row": { base: { display: "flex", justifyContent: "center", gap: "12px", marginTop: "32px", flexWrap: "wrap" }, phone: { justifyContent: "flex-start" } },
    button: { base: { display: "inline-block", paddingTop: "14px", paddingBottom: "14px", paddingLeft: "24px", paddingRight: "24px", backgroundColor: "token:action", color: "token:on-action", borderRadius: "10px", fontWeight: "600", textDecoration: "none" } },
    "button-ghost": { base: { display: "inline-block", paddingTop: "14px", paddingBottom: "14px", paddingLeft: "24px", paddingRight: "24px", borderWidth: "1px", borderColor: "token:ink-on-brand", color: "token:ink-on-brand", borderRadius: "10px", fontWeight: "600", textDecoration: "none" } },
    "section-title": { base: { fontFamily: "display", fontSize: "40px", lineHeight: "1.1", fontWeight: "600" }, phone: { fontSize: "30px" } },
    "section-lead": { base: { fontSize: "18px", lineHeight: "1.6", color: "token:ink-muted", marginTop: "12px", maxWidth: "640px" } },
    "card-grid": { base: { display: "grid", gridColumns: "3", gap: "24px", marginTop: "40px" }, tablet: { gridColumns: "2" }, phone: { gridColumns: "1" } },
    card: { base: { backgroundColor: "token:surface", borderRadius: "16px", borderWidth: "1px", borderColor: "token:line", paddingTop: "12px", paddingBottom: "20px", paddingLeft: "12px", paddingRight: "12px", boxShadow: "token:sm" } },
    "card-image": { base: { width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: "10px", display: "block" } },
    "card-title": { base: { fontFamily: "display", fontSize: "20px", fontWeight: "600", marginTop: "14px", paddingLeft: "6px", paddingRight: "6px" } },
    "card-meta": { base: { fontSize: "15px", color: "token:ink-muted", marginTop: "4px", paddingLeft: "6px", paddingRight: "6px" } },
    footer: { base: { paddingTop: "40px", paddingBottom: "40px", paddingLeft: "24px", paddingRight: "24px", borderTopWidth: "1px", borderTopStyle: "solid", borderTopColor: "token:line", color: "token:ink-muted", fontSize: "14px", textAlign: "center" } },
  };
}

const E = (type: ElementType, extra: Partial<PageElement>, children?: PageElement[]): PageElement => ({ id: uid("el"), type, styles: {}, ...extra, ...(children ? { children } : {}) });

export function seedPages(): Page[] {
  const home: Page = {
    id: "page_home", name: "Home", slug: "",
    root: E("body", { cls: "page" }, [
      E("section", { cls: "hero", label: "Hero" }, [
        E("container", { cls: "container" }, [
          E("text", { cls: "eyebrow", text: "Los Angeles · Professional onboarding", styles: { base: { color: "token:ink-on-brand" } } }),
          E("heading", { cls: "hero-title", level: 1, text: "Extraordinary talent. Everyday solutions." }),
          E("paragraph", { cls: "hero-lead", text: "Hollywood professionals between productions, ready for the projects in your everyday life." }),
          E("div", { cls: "button-row" }, [
            E("button", { cls: "button", text: "Get on the call sheet", href: "/professionals/" }),
            E("button", { cls: "button-ghost", text: "Read the Journal", href: "#journal" }),
          ]),
        ]),
      ]),
      E("section", { cls: "section", label: "Gigsters" }, [
        E("container", { cls: "container" }, [
          E("heading", { cls: "section-title", level: 2, text: "On the call sheet" }),
          E("paragraph", { cls: "section-lead", text: "Approved Gigsters, straight from the CMS. Approve someone in Gigsters and they appear here." }),
          E("collection", { cls: "card-grid", source: { collectionId: "gigsters", limit: 6, filterField: "status", filterValue: "approved" } }, [
            E("item", { cls: "card" }, [
              E("image", { cls: "card-image", bind: "photo", alt: "" }),
              E("heading", { cls: "card-title", level: 3, text: "Name", bind: "name" }),
              E("text", { cls: "card-meta", text: "Department", bind: "position" }),
            ]),
          ]),
        ]),
      ]),
      E("section", { cls: "section", label: "Journal", styles: { base: { backgroundColor: "token:surface-sunken" } } }, [
        E("container", { cls: "container" }, [
          E("heading", { cls: "section-title", level: 2, text: "From the Journal" }),
          E("collection", { cls: "card-grid", source: { collectionId: "journal", limit: 3, sortField: "date", sortDir: "desc", filterField: "status", filterValue: "published" } }, [
            E("item", { cls: "card" }, [
              E("image", { cls: "card-image", bind: "cover", alt: "" }),
              E("text", { cls: "eyebrow", bind: "category", text: "Category", styles: { base: { marginTop: "14px", paddingLeft: "6px", color: "token:ink-brand" } } }),
              E("heading", { cls: "card-title", level: 3, text: "Title", bind: "title" }),
              E("paragraph", { cls: "card-meta", text: "Summary", bind: "dek" }),
            ]),
          ]),
        ]),
      ]),
      E("section", { cls: "footer", label: "Footer" }, [E("text", { text: "© 2026 Between Gigs · Extraordinary talent. Everyday solutions." })]),
    ]),
  };
  const about: Page = {
    id: "page_about", name: "About", slug: "about",
    root: E("body", { cls: "page" }, [
      E("section", { cls: "section" }, [
        E("container", { cls: "container" }, [
          E("text", { cls: "eyebrow", text: "About", styles: { base: { color: "token:ink-brand" } } }),
          E("heading", { cls: "section-title", level: 1, text: "Between productions, the craft is still here." }),
          E("paragraph", { cls: "section-lead", text: "Between Gigs connects film and TV professionals with people and businesses who need their skills between productions." }),
        ]),
      ]),
    ]),
  };
  return [home, about];
}
