/*
 * Client management for the workspace: who we're working for, where each relationship stands, their projects, tasks,
 * milestones and notes. Between Gigs is the real client; the others are fictional samples so the board has shape.
 * There's no backend yet: the seed below plus any edits, kept per browser (useClients). Nothing private goes here.
 */
import * as React from "react";
import { newProjectFrom, type LocalProject } from "./template";

export type ClientStage = "lead" | "proposal" | "active" | "paused" | "complete";
export const stages: { id: ClientStage; name: string; sub: string }[] = [
  { id: "lead", name: "Lead", sub: "First conversations" },
  { id: "proposal", name: "Proposal", sub: "Scope and quote out" },
  { id: "active", name: "Active", sub: "Work under way" },
  { id: "paused", name: "Paused", sub: "Waiting on the client" },
  { id: "complete", name: "Complete", sub: "Delivered" },
];
export const stageTone: Record<ClientStage, "neutral" | "info" | "success" | "warning"> = { lead: "neutral", proposal: "info", active: "success", paused: "warning", complete: "neutral" };

export interface ClientTask { id: string; title: string; done: boolean; due?: string; owner?: string }
export interface Milestone { id: string; title: string; date: string; done: boolean }
export interface ClientNote { id: string; at: string; by: string; text: string }

export interface Client {
  id: string;
  name: string;
  /** Fictional sample, labelled as such. */
  sample?: boolean;
  stage: ClientStage;
  industry: string;
  summary: string;
  nextStep: string;
  started: string;
  contacts: { name: string; role: string }[];
  /** Workspace projects (lib/workspace/projects.ts) that belong to this client. */
  projectIds: string[];
  /** Projects started from the template in this browser. */
  local: LocalProject[];
  links: { label: string; href: string }[];
  tasks: ClientTask[];
  milestones: Milestone[];
  notes: ClientNote[];
}

const seed: Client[] = [
  {
    id: "between-gigs", name: "Between Gigs", stage: "active", industry: "Marketplace · entertainment talent", started: "2026-09-15",
    summary: "A marketplace where entertainment professionals offer their skills between productions. We're building 2.0: the Gigster journey, the owner tools, Studio and the workspace.",
    nextStep: "Review the new onboarding (Edit on your profile) and pick a Figma team for image generation.",
    contacts: [{ name: "Client team", role: "Product owners" }, { name: "Anu", role: "Backend" }, { name: "Our studio", role: "Design and front end" }],
    projectIds: ["canvas", "questionnaire", "site", "owners", "emails", "studio", "preview", "proposals", "build-map", "handoff", "design-system"],
    local: [],
    links: [
      { label: "Live preview", href: "https://between-gigs.github.io/between-gig-2.0/" },
      { label: "Repository", href: "https://github.com/Between-Gigs/between-gig-2.0" },
      { label: "Backend handoff", href: "https://between-gigs.github.io/between-gig-2.0/artifacts/backend-handoff/" },
    ],
    tasks: [
      { id: "t1", title: "Edit on your profile: client review of the new default onboarding", done: false, due: "2026-10-30", owner: "Client" },
      { id: "t2", title: "Choose the Figma team for generated imagery", done: false, due: "2026-10-30", owner: "Client" },
      { id: "t3", title: "Worker API and D1 tables (DataSource → api.ts)", done: false, due: "2026-11-14", owner: "Anu" },
      { id: "t4", title: "Clerk production instance and DNS", done: false, due: "2026-11-07", owner: "Client" },
      { id: "t5", title: "Owner tools and Studio on the workspace shell", done: false, due: "2026-11-06", owner: "Studio" },
      { id: "t6", title: "Share images on every page", done: true, owner: "Studio" },
      { id: "t7", title: "Workspace with project switcher and ⌘K", done: true, owner: "Studio" },
    ],
    milestones: [
      { id: "m1", title: "Profile builder and owner tools", date: "2026-10-20", done: true },
      { id: "m2", title: "Studio, Live site and build map", date: "2026-10-27", done: true },
      { id: "m3", title: "Onboarding 2.0 and the workspace", date: "2026-10-30", done: false },
      { id: "m4", title: "Backend connected, real sign-ups", date: "2026-11-20", done: false },
    ],
    notes: [
      { id: "n1", at: "2026-10-28T20:28:00Z", by: "Client", text: "Prioritise onboarding where Gigsters edit directly on a blank profile, and make it more wow." },
      { id: "n2", at: "2026-10-28T20:58:00Z", by: "Client", text: "Put many things into one place until they're ready to move, like a Webflow or Framer projects page. Rebuild the shell: top, bottom, left, right, project switcher, ⌘K." },
      { id: "n3", at: "2026-10-29T03:27:00Z", by: "Client", text: "Next: the onboarding experience, an internal project management system for clients, and a standard template for new client projects." },
    ],
  },
  {
    id: "northlight", name: "Northlight Studio", sample: true, stage: "proposal", industry: "Architecture practice", started: "2026-10-21",
    summary: "A small practice wanting a portfolio site with a project archive their team can update.", nextStep: "Send the website proposal and timeline.",
    contacts: [{ name: "Sample contact", role: "Principal" }], projectIds: [], local: [], links: [],
    tasks: [{ id: "t1", title: "Proposal: website, 6 weeks", done: false, due: "2026-11-03", owner: "Studio" }, { id: "t2", title: "Collect project photography", done: false, owner: "Client" }],
    milestones: [{ id: "m1", title: "Proposal sent", date: "2026-11-03", done: false }], notes: [{ id: "n1", at: "2026-10-22T15:00:00Z", by: "Studio", text: "Intro call: wants a calm, image-led site." }],
  },
  {
    id: "harbor", name: "Harbor & Co.", sample: true, stage: "lead", industry: "Hospitality group", started: "2026-10-26",
    summary: "Three restaurants looking for one booking and events site.", nextStep: "Book a discovery call.",
    contacts: [{ name: "Sample contact", role: "Operations" }], projectIds: [], local: [], links: [],
    tasks: [{ id: "t1", title: "Discovery call", done: false, due: "2026-11-05", owner: "Studio" }], milestones: [], notes: [],
  },
  {
    id: "kestrel", name: "Kestrel Health", sample: true, stage: "paused", industry: "Clinic network", started: "2026-08-04",
    summary: "Patient onboarding flow; paused while their compliance review finishes.", nextStep: "Check in after their review on Nov 10.",
    contacts: [{ name: "Sample contact", role: "Product" }], projectIds: [], local: [], links: [],
    tasks: [{ id: "t1", title: "Onboarding flow v2", done: false, owner: "Studio" }, { id: "t2", title: "Accessibility audit", done: true, owner: "Studio" }],
    milestones: [{ id: "m1", title: "Flow v1 delivered", date: "2026-09-12", done: true }, { id: "m2", title: "Restart after review", date: "2026-11-10", done: false }], notes: [],
  },
  {
    id: "fieldnotes", name: "Fieldnotes Journal", sample: true, stage: "complete", industry: "Publishing", started: "2026-06-02",
    summary: "Editorial site and newsletter templates, delivered.", nextStep: "Ask for a testimonial.",
    contacts: [{ name: "Sample contact", role: "Editor" }], projectIds: [], local: [], links: [],
    tasks: [{ id: "t1", title: "Launch", done: true, owner: "Studio" }], milestones: [{ id: "m1", title: "Launched", date: "2026-08-20", done: true }], notes: [],
  },
];

const KEY = "bg-ws-clients";
let cache: Client[] | null = null;
const listeners = new Set<() => void>();
const read = (): Client[] => {
  if (cache) return cache;
  try { const raw = localStorage.getItem(KEY); cache = raw ? (JSON.parse(raw) as Client[]) : structuredClone(seed); } catch { cache = structuredClone(seed); }
  return cache;
};
const write = (next: Client[]) => {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or blocked: edits last for this visit */ }
  listeners.forEach((l) => l());
};

/** The clients, with edits kept in this browser. Empty until mounted, so the static build and the first paint agree. */
export function useClients() {
  const [clients, setClients] = React.useState<Client[]>([]);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const sync = () => setClients(read());
    sync();
    setReady(true); // eslint-disable-line react-hooks/set-state-in-effect
    listeners.add(sync);
    return () => { listeners.delete(sync); };
  }, []);
  const update = React.useCallback((id: string, fn: (c: Client) => Client) => write(read().map((c) => (c.id === id ? fn(c) : c))), []);
  const add = React.useCallback((c: Client) => write([...read(), c]), []);
  const reset = React.useCallback(() => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } cache = null; write(read()); }, []);
  const addProject = React.useCallback((clientId: string, p: Parameters<typeof newProjectFrom>[0]) => {
    const project = newProjectFrom(p);
    write(read().map((c) => (c.id === clientId ? { ...c, local: [...c.local, project] } : c)));
    return project;
  }, []);
  return { clients, ready, update, add, reset, addProject };
}

export const uid = () => Math.random().toString(36).slice(2, 9);
export const shortDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
