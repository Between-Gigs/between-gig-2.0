/*
 * A Designer page as code, the way a site builder exports it: index.html with class names only, and styles.css with
 * every class (and each element's own styles, as a generated class) cascading desktop → tablet → phone through media
 * queries. Collection lists come out filled with the CMS items they show. Also: custom CSS scoped to the canvas.
 */
import { asset } from "@/lib/site";
import { cellText } from "./query";
import { breakpoints, elementInfo, toCss } from "./pages";
import type { Base, Breakpoint, Collection, Page, PageElement, StudioRecord, StyleProps, Styles } from "./types";

const kebab = (k: string) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function declarations(p: StyleProps, indent: string) {
  return Object.entries(toCss(p) as Record<string, string>).map(([k, v]) => `${indent}${kebab(k)}: ${v};`).join("\n");
}

/** Rules for one selector across the breakpoints, grouped so each media query appears once. */
function rules(selector: string, styles: Styles, out: Record<Breakpoint, string[]>) {
  for (const bp of ["base", "tablet", "phone"] as Breakpoint[]) {
    const p = styles[bp];
    if (!p || !Object.keys(p).length) continue;
    const indent = bp === "base" ? "  " : "    ";
    out[bp].push(`${bp === "base" ? "" : "  "}${selector} {\n${declarations(p, indent)}\n${bp === "base" ? "" : "  "}}`);
  }
}

const mq: Record<Exclude<Breakpoint, "base">, string> = { tablet: "@media (max-width: 991px)", phone: "@media (max-width: 478px)" };

function tagOf(el: PageElement) {
  switch (el.type) {
    case "body": return "body";
    case "section": return "section";
    case "heading": return `h${Math.min(6, Math.max(1, el.level ?? 2))}`;
    case "paragraph": return "p";
    case "link": case "button": return "a";
    case "image": return "img";
    case "divider": return "hr";
    default: return "div";
  }
}

export function exportPage(base: Base, page: Page): { html: string; css: string } {
  const own = new Map<string, string>();
  let n = 0;
  // Elements with styles of their own get a generated combo class, like "heading-3".
  const ownClass = (el: PageElement) => {
    if (!Object.values(el.styles).some((s) => s && Object.keys(s).length)) return undefined;
    let c = own.get(el.id);
    if (!c) { c = `${el.type}-${++n}`; own.set(el.id, c); }
    return c;
  };
  const titles = new Map<string, string>();
  for (const c of base.collections) {
    const pf = c.fields.find((f) => f.id === c.primaryField);
    for (const r of c.records) titles.set(r.id, cellText(pf, r.values[c.primaryField]));
  }
  const lookup = (id: string) => titles.get(id) ?? "";
  const ownStyles: [string, Styles][] = [];

  const render = (el: PageElement, depth: number, ctx?: { collection: Collection; record: StudioRecord }): string => {
    const pad = "  ".repeat(depth);
    const cls = [el.cls, ownClass(el)].filter(Boolean).join(" ");
    const oc = ownClass(el);
    if (oc && !ownStyles.some(([c]) => c === oc)) ownStyles.push([oc, el.styles]);
    const attr = cls ? ` class="${esc(cls)}"` : "";
    const field = ctx && el.bind ? ctx.collection.fields.find((f) => f.id === el.bind) : undefined;
    const bound = field ? ctx!.record.values[field.id] : undefined;
    const text = esc(field ? cellText(field, bound, lookup) : el.text ?? "");
    const tag = tagOf(el);
    if (el.type === "collection") {
      const s = el.source;
      const c = s ? base.collections.find((x) => x.id === s.collectionId) : undefined;
      const template = el.children?.[0];
      if (!c || !template) return `${pad}<div${attr}></div>`;
      const records = c.records.filter((r) => {
        if (!s?.filterField || !s.filterValue) return true;
        const v = r.values[s.filterField];
        return Array.isArray(v) ? v.includes(s.filterValue) : String(v ?? "") === s.filterValue || (s.filterValue === "true" && v === true);
      }).slice(0, Math.max(1, s?.limit || 1));
      return `${pad}<div${attr} role="list">\n${pad}  <!-- ${records.length} items from the ${esc(c.name)} collection -->\n${records.map((r) => render(template, depth + 1, { collection: c, record: r })).join("\n")}\n${pad}</div>`;
    }
    if (el.type === "image") {
      const src = field ? (typeof bound === "string" ? bound : "") : el.src ?? "";
      return `${pad}<img${attr} src="${esc(src ? asset(src) : "")}" alt="${esc(el.alt ?? "")}">`;
    }
    if (el.type === "divider") return `${pad}<hr${attr}>`;
    if (el.type === "link" || el.type === "button") {
      const href = field?.type === "url" ? String(bound ?? "#") : el.href ?? "#";
      return `${pad}<a${attr} href="${esc(href)}"${el.newTab ? ' target="_blank" rel="noreferrer"' : ""}>${field?.type === "url" ? esc(el.text ?? "") : text}</a>`;
    }
    if (elementInfo[el.type].container || el.type === "item") {
      const kids = (el.children ?? []).map((c) => render(c, depth + 1, ctx)).join("\n");
      const role = el.type === "item" ? ' role="listitem"' : "";
      return kids ? `${pad}<${tag}${attr}${role}>\n${kids}\n${pad}</${tag}>` : `${pad}<${tag}${attr}${role}></${tag}>`;
    }
    return `${pad}<${tag}${attr}>${text}</${tag}>`;
  };

  const body = render(page.root, 1);
  const html = `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${esc(page.name)}</title>\n  <link rel="stylesheet" href="styles.css">${page.customCss ? '\n  <link rel="stylesheet" href="custom.css">' : ""}\n</head>\n${body.replace(/^ {2}/gm, "")}\n</html>\n`;

  const out: Record<Breakpoint, string[]> = { base: [], tablet: [], phone: [] };
  const used = new Set<string>();
  const collect = (el: PageElement) => { if (el.cls) used.add(el.cls); el.children?.forEach(collect); };
  collect(page.root);
  for (const c of [...used]) if (base.classes[c]) rules(c === "page" ? "body" : `.${c}`, base.classes[c], out);
  for (const [c, s] of ownStyles) rules(`.${c}`, s, out);
  const css = [
    `/* ${page.name}: exported from Between Gigs Studio. Colours and fonts are the design system's tokens (CSS variables). */`,
    out.base.join("\n\n"),
    ...(["tablet", "phone"] as const).filter((bp) => out[bp].length).map((bp) =>
      `/* ${breakpoints.find((b) => b.id === bp)?.label}: ${breakpoints.find((b) => b.id === bp)?.hint} */\n${mq[bp]} {\n${out[bp].join("\n\n")}\n}`),
  ].join("\n\n") + "\n";
  return { html, css };
}

/**
 * Custom CSS on the canvas and in the site preview. Elements carry data-cls rather than class (so a class named
 * "container" can't pick up the site's own styles), so `.name` in a selector becomes [data-cls~="name"], scoped to
 * the page. At-rules (media queries) keep their condition and have their rules rewritten.
 */
export function scopeCss(css: string, scope: string) {
  let out = "", prelude = "", depth = 0;
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (ch === "{") {
      const p = prelude.trim();
      out += p.startsWith("@") ? `${p} {` : `${p.split(",").map((s) => `${scope} ${s.trim().replace(/\.(-?[_a-zA-Z][\w-]*)/g, '[data-cls~="$1"]')}`).join(", ")} {`;
      prelude = ""; depth++;
    } else if (ch === "}") { out += `${prelude}}`; prelude = ""; depth = Math.max(0, depth - 1); }
    else if (ch === ";" ) { out += `${prelude};`; prelude = ""; }
    else prelude += ch;
  }
  return out;
}
