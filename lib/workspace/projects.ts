/*
 * The workspace's projects: everything we're building, in one place until it's ready to move (like Webflow's or
 * Framer's projects page). A project is a set of pages; opening one shows it inside the workspace shell. Pages that
 * need someone signed in open in a preview frame with its own sample session (lib/data/sample.ts, "bg-preview:").
 */
import { appPages, type AppPage } from "@/lib/studio/app-pages";

export type FolderId = "product" | "onboarding" | "tools" | "proposals" | "artifacts";
export type ProjectStatus = "live" | "experiment" | "reference";

export interface ProjectPage {
  id: string;
  title: string;
  /** The route inside this site. */
  path: string;
  /** A group heading in the project's page list. */
  group?: string;
  /** Who the preview frame shows it as: "visitor", "owner", "invited" or "gigster:<personId>". */
  as?: string;
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  folder: FolderId;
  status: ProjectStatus;
  summary: string;
  /** Cover image under public/. */
  cover: string;
  /** Last meaningful change, YYYY-MM-DD. */
  updated: string;
  pages: ProjectPage[];
  /** Plain static pages (shared artifacts), not part of the app's build. */
  staticPages?: boolean;
}

export const folders: { id: FolderId; name: string; sub: string }[] = [
  { id: "product", name: "Product", sub: "The live site, owner tools and emails" },
  { id: "onboarding", name: "Onboarding", sub: "How a Gigster joins and builds a profile" },
  { id: "tools", name: "Studio and tools", sub: "Editors, previews and checks" },
  { id: "proposals", name: "Proposals", sub: "Directions not yet adopted" },
  { id: "artifacts", name: "Artifacts", sub: "Shared pages: maps, handoffs, the design system" },
];

export const statusLabel: Record<ProjectStatus, string> = { live: "In use", experiment: "Experiment", reference: "Reference" };

const fromApp = (p: AppPage, group?: string): ProjectPage => ({
  id: p.id, title: p.title, path: p.path, group, note: p.text,
  as: !p.as ? undefined : p.as.role === "gigster" ? `gigster:${p.as.id}` : p.as.role,
});
const lane = (l: AppPage["lane"], group?: string) => appPages.filter((p) => p.lane === l).map((p) => fromApp(p, group));

export const projects: Project[] = [
  {
    id: "canvas", name: "Edit on your profile", folder: "onboarding", status: "experiment", updated: "2026-10-28", cover: "thumbs/canvas.jpg",
    summary: "Onboarding as editing: the Gigster lands on their own profile, blank, and fills each part in place, with a spotlight, a live search card, quick picks and a first-draft About me.",
    pages: [
      { id: "canvas-blank", title: "Blank profile", path: "/profile/canvas/", as: "gigster:ava-sinclair", group: "States", note: "Ava has just joined. Only her name is in." },
      { id: "canvas-draft", title: "Part-filled draft", path: "/profile/canvas/", as: "gigster:elena-petrova", group: "States", note: "Elena stopped partway; the next spot glows." },
      { id: "canvas-changes", title: "Changes requested", path: "/profile/canvas/", as: "gigster:hana-kim", group: "States", note: "The team's notes are pinned to the parts they're about." },
    ],
  },
  {
    id: "questionnaire", name: "Profile questionnaire", folder: "onboarding", status: "live", updated: "2026-10-26", cover: "thumbs/elena.jpg",
    summary: "The current onboarding: invite, account, five autosaved steps with a live card, review and submit.",
    pages: [
      ...appPages.filter((p) => ["join-valid", "login"].includes(p.id)).map((p) => fromApp(p, "Join")),
      ...appPages.filter((p) => ["builder-steps", "builder-review", "profile-approved"].includes(p.id)).map((p) => fromApp(p, "Build")),
      { id: "my-profile-new", title: "My profile, not started", path: "/profile/", as: "gigster:grace-liu", group: "Build" },
    ],
  },
  {
    id: "site", name: "Between Gigs site", folder: "product", status: "live", updated: "2026-10-26", cover: "thumbs/home.jpg",
    summary: "The public pages: the call sheet, Crew Call, the Storyboard, For professionals, a live profile and the policies.",
    pages: lane("visitor").filter((p) => p.id !== "proposal-visitor"),
  },
  {
    id: "owners", name: "Owner tools", folder: "product", status: "live", updated: "2026-10-24", cover: "thumbs/owner.jpg",
    summary: "The team's side: dashboard, review queue, reviewing a profile, people search and inviting the waitlist.",
    pages: lane("owner"),
  },
  {
    id: "emails", name: "Emails", folder: "product", status: "live", updated: "2026-10-22", cover: "thumbs/emails.jpg",
    summary: "Every email the system sends, light and dark, plus the sample outbox.",
    pages: [...appPages.filter((p) => p.id === "emails").map((p) => fromApp(p, "All")), ...lane("email", "Templates")],
  },
  {
    id: "studio", name: "Studio", folder: "tools", status: "experiment", updated: "2026-10-26", cover: "thumbs/studio.jpg",
    summary: "A no-code editor for Between Gigs: the CMS, the page designer, the code editor and the Live site behind every page.",
    pages: [
      { id: "studio-home", title: "Designer and CMS", path: "/studio/" },
      { id: "studio-live", title: "Live site inspector", path: "/studio/?site=home&tab=design" },
      { id: "studio-code", title: "Code", path: "/studio/?site=home&tab=code" },
    ],
  },
  {
    id: "preview", name: "Preview guide and effects", folder: "tools", status: "reference", updated: "2026-10-25", cover: "thumbs/cursors.jpg",
    summary: "Try every role in the sample, plus the pointer effects and page-curtain experiments.",
    pages: [
      { id: "preview-guide", title: "Preview guide", path: "/preview/" },
      { id: "preview-cursors", title: "Mouse effects", path: "/preview/cursors/" },
      { id: "preview-curtain", title: "Page curtain", path: "/preview/curtain/" },
    ],
  },
  {
    id: "proposals", name: "Home once we open", folder: "proposals", status: "experiment", updated: "2026-10-20", cover: "thumbs/proposals.jpg",
    summary: "Proposals for the open platform's home: as a visitor, a Gigster and an owner see it.",
    pages: [
      { id: "proposal-visitor", title: "Visitor", path: "/proposals/home/" },
      { id: "proposal-gigster", title: "Gigster", path: "/proposals/home/?view=gigster" },
      { id: "proposal-owner", title: "Owner", path: "/proposals/home/?view=owner" },
    ],
  },
  {
    id: "build-map", name: "Build map", folder: "artifacts", status: "reference", updated: "2026-10-27", cover: "workspace/covers/build-map.jpg", staticPages: true,
    summary: "Every page in 3D, from first visit to live profile, with the Design, Code, Data and API stack behind each one.",
    pages: [{ id: "build-map", title: "Build map", path: "/artifacts/build-map/" }],
  },
  {
    id: "handoff", name: "Backend handoff", folder: "artifacts", status: "reference", updated: "2026-10-22", cover: "workspace/covers/handoff.jpg", staticPages: true,
    summary: "What to connect to the backend: architecture, data model, every endpoint, emails and the build order.",
    pages: [{ id: "handoff", title: "Backend handoff", path: "/artifacts/backend-handoff/" }],
  },
  {
    id: "design-system", name: "Design system", folder: "artifacts", status: "reference", updated: "2026-10-21", cover: "workspace/covers/design-system.jpg", staticPages: true,
    summary: "Tokens, components and templates, with the clickable prototype and the coming-soon template.",
    pages: [
      { id: "ds-showcase", title: "Showcase", path: "/artifacts/showcase/" },
      { id: "ds-prototype", title: "Prototype", path: "/artifacts/showcase/app/" },
      { id: "ds-coming-soon", title: "Coming soon template", path: "/artifacts/showcase/templates/coming-soon.html" },
    ],
  },
];

export const projectById = (id: string | null | undefined) => projects.find((p) => p.id === id);
export const folderOf = (id: FolderId) => folders.find((f) => f.id === id)!;
export const updatedLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** The workspace URL for a project, optionally at one of its pages. Each project has its own path (and share image). */
export const openHref = (project: string, page?: string) => `/workspace/${project}/${page ? `?page=${page}` : ""}`;
