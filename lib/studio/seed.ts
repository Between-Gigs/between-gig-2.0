/*
 * The Between Gigs base: Studio's first workspace, filled from the app's fictional sample data (Gigsters,
 * services, Journal articles, Storyboard scenes and the waitlist). This is the only Studio file that imports
 * Between Gigs code; a standalone Studio swaps it for its own templates.
 */
import { articles, readingMinutes } from "@/lib/journal";
import { buildWaitlist, seedPeople } from "@/lib/data/seed";
import { offSetServices, onSetSkills, waitlistCategories } from "@/lib/data/taxonomy";
import { scenePages } from "@/lib/storyboard";
import type { Person } from "@/lib/data/types";
import { newView } from "./query";
import type { Base, CellValue, Choice, Collection, Field, StudioRecord, View } from "./types";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const choices = (labels: readonly string[], ids?: readonly string[]): Choice[] => labels.map((label, i) => ({ id: ids?.[i] ?? slug(label), label, color: (i % 8) + 1 }));
const rec = (id: string, values: Record<string, CellValue>, createdAt: string): StudioRecord => ({ id, values, createdAt });
const view = (c: Collection, type: View["type"], name: string, patch: Partial<View> = {}): View => ({ ...newView(type, c, name), id: `viw_${c.id}_${slug(name)}`, ...patch });

function gigsters(serviceIds: Map<string, string>): Collection {
  const statuses = choices(["Invited", "Registered", "Draft", "Submitted", "Changes requested", "Approved"], ["invited", "registered", "draft", "submitted", "changes_requested", "approved"]);
  const fields: Field[] = [
    { id: "name", name: "Name", type: "text" },
    { id: "photo", name: "Photo", type: "image" },
    { id: "status", name: "Status", type: "select", choices: statuses },
    { id: "position", name: "Department", type: "select", choices: choices([...new Set([...onSetSkills, ...seedPeople.map((p) => p.fields?.position).filter((x): x is string => !!x)])]) },
    { id: "services", name: "Services", type: "link", linkTable: "services" },
    { id: "years", name: "Years in the business", type: "number" },
    { id: "rate", name: "Hourly rate", type: "currency" },
    { id: "areas", name: "Areas", type: "multiSelect", choices: choices(["Eastside", "Downtown", "Hollywood", "Westside", "The Valley", "Pasadena area", "South Bay"]) },
    { id: "email", name: "Email", type: "email" },
    { id: "joined", name: "Joined", type: "date" },
    { id: "featured", name: "Featured on home", type: "checkbox" },
    { id: "about", name: "About", type: "longText" },
  ];
  const day = (n: number) => new Date(Date.UTC(2026, 9, 21 - n)).toISOString().slice(0, 10);
  const records = seedPeople.map((p, i) => {
    const f = p.fields ?? {};
    const position = fields[3].choices!.find((c) => c.label === f.position)?.id ?? null;
    return rec(p.id, {
      name: p.name, photo: f.photo ?? null, status: p.status, position,
      services: (f.services ?? []).map((s) => serviceIds.get(s)).filter((x): x is string => !!x),
      years: f.years ? Number(f.years) : null, rate: f.rate ? Number(f.rate) : null,
      areas: (f.areas ?? []).map(slug), email: `${p.name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      joined: day(p.days + 3), featured: p.status === "approved" && i < 4, about: f.about ?? null,
    }, `${day(p.days + 3)}T10:00:00Z`);
  });
  const c: Collection = { id: "gigsters", name: "Gigsters", icon: "users", description: "Professionals on the call sheet, from invite to live profile.", primaryField: "name", fields, records, views: [] };
  c.views = [
    view(c, "grid", "All Gigsters", { hidden: ["about"] }),
    view(c, "kanban", "Review pipeline", { groupBy: "status", hidden: ["email", "joined", "about", "areas", "featured"] }),
    view(c, "gallery", "Directory", { filters: [{ id: "flt_live", fieldId: "status", op: "is", value: "approved" }], hidden: ["email", "joined", "about", "featured", "areas"] }),
  ];
  return c;
}

function services(): Collection {
  const records = [...offSetServices.map((s) => ({ s, group: "off" })), ...onSetSkills.map((s) => ({ s, group: "on" }))].map(({ s, group }, i) =>
    rec(`svc-${slug(s)}`, { name: s, group, shown: group === "off", order: i + 1 }, "2026-10-01T10:00:00Z"));
  const c: Collection = {
    id: "services", name: "Services", icon: "tag", description: "The services Gigsters offer clients, and their on-set departments.", primaryField: "name",
    fields: [
      { id: "name", name: "Name", type: "text" },
      { id: "group", name: "Group", type: "select", choices: [{ id: "off", label: "For clients", color: 1 }, { id: "on", label: "On set", color: 5 }] },
      { id: "shown", name: "Shown in search", type: "checkbox" },
      { id: "order", name: "Order", type: "number" },
    ],
    records, views: [],
  };
  c.views = [view(c, "grid", "All services", { sorts: [{ fieldId: "order", dir: "asc" }] })];
  return c;
}

function journal(): Collection {
  const cats = choices(["Story", "Production guide", "Industry report"]);
  const c: Collection = {
    id: "journal", name: "Journal", icon: "book", description: "Articles for the Between Gigs Journal.", primaryField: "title",
    fields: [
      { id: "title", name: "Title", type: "text" },
      { id: "cover", name: "Cover", type: "image" },
      { id: "status", name: "Status", type: "select", choices: [{ id: "draft", label: "Draft", color: 3 }, { id: "review", label: "In review", color: 6 }, { id: "published", label: "Published", color: 1 }] },
      { id: "category", name: "Category", type: "select", choices: cats },
      { id: "author", name: "Author", type: "text" },
      { id: "date", name: "Publish date", type: "date" },
      { id: "minutes", name: "Reading time (min)", type: "number" },
      { id: "dek", name: "Summary", type: "longText" },
    ],
    records: articles.map((a, i) => rec(`art-${a.id}`, {
      title: a.title, cover: a.cover, status: i === 0 ? "review" : "published", category: slug(a.category), author: a.byline.split(" · ")[0].trim(),
      date: a.date, minutes: readingMinutes(a), dek: a.dek,
    }, `${a.date}T09:00:00Z`)),
    views: [],
  };
  c.views = [
    view(c, "list", "Articles", { sorts: [{ fieldId: "date", dir: "desc" }] }),
    view(c, "gallery", "Covers"),
    view(c, "calendar", "Publishing calendar", { dateField: "date" }),
    view(c, "grid", "All fields"),
  ];
  return c;
}

function storyboard(): Collection {
  const c: Collection = {
    id: "storyboard", name: "Storyboard", icon: "image", description: "The illustrated scenes in the public Storyboard book.", primaryField: "title",
    fields: [
      { id: "title", name: "Title", type: "text" },
      { id: "art", name: "Artwork", type: "image" },
      { id: "place", name: "Place", type: "text" },
      { id: "type", name: "Page type", type: "select", choices: [{ id: "cover", label: "Cover", color: 7 }, { id: "solo", label: "Solo", color: 2 }, { id: "crew", label: "Crew", color: 4 }] },
      { id: "customer", name: "Customer", type: "select", choices: [{ id: "cover", label: "Cover", color: 7 }, { id: "individual", label: "Individual", color: 1 }, { id: "business", label: "Business", color: 5 }] },
      { id: "story", name: "Story", type: "longText" },
    ],
    records: scenePages.map((p, i) => rec(`scn-${slug(p.file)}`, {
      title: p.title, art: `art/storyboard/${p.type === "cover" ? "" : "thumbs/"}${p.file}`, place: p.place, type: p.type, customer: p.customer, story: p.story,
    }, `2026-10-${String(1 + (i % 20)).padStart(2, "0")}T10:00:00Z`)),
    views: [],
  };
  c.views = [view(c, "gallery", "Scenes"), view(c, "kanban", "By page type", { groupBy: "type" }), view(c, "grid", "All fields")];
  return c;
}

function waitlist(): Collection {
  const people = seedPeople.map((p) => ({ email: `${p.name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`, waitlistZip: p.zip, waitlistCategory: p.category, invitedAt: "2026-10-15T10:00:00Z" })) as Person[];
  const invited = new Set(people.map((p) => p.email));
  const rows = buildWaitlist(people, 120);
  const c: Collection = {
    id: "waitlist", name: "Waitlist", icon: "inbox", description: "Sign-ups from Get on the call sheet.", primaryField: "email",
    fields: [
      { id: "email", name: "Email", type: "email" },
      { id: "zip", name: "ZIP", type: "text" },
      { id: "category", name: "Category", type: "select", choices: choices(waitlistCategories.map(([, l]) => l), waitlistCategories.map(([id]) => id)) },
      { id: "placement", name: "Signed up from", type: "select", choices: choices(["hero", "nav", "service", "footer", "profile-maya"]).map((o) => ({ ...o, label: { hero: "Home hero", nav: "Navigation", service: "Service page", footer: "Footer", "profile-maya": "A profile" }[o.id] ?? o.label })) },
      { id: "joined", name: "Joined", type: "date" },
      { id: "invited", name: "Invited", type: "checkbox" },
    ],
    records: rows.map((r) => rec(r.id, { email: r.email, zip: r.zip, category: r.category, placement: slug(r.placement), joined: r.createdAt.slice(0, 10), invited: invited.has(r.email) }, r.createdAt)),
    views: [],
  };
  c.views = [view(c, "grid", "Everyone", { sorts: [{ fieldId: "joined", dir: "desc" }] }), view(c, "kanban", "By category", { groupBy: "category" })];
  return c;
}

export function seedBase(): Base {
  const svc = services();
  const ids = new Map(svc.records.map((r) => [String(r.values.name), r.id]));
  return { id: "between-gigs", name: "Between Gigs", version: 1, collections: [gigsters(ids), journal(), storyboard(), svc, waitlist()] };
}
