/*
 * The pages of Between Gigs itself, as Studio's page inspector sees them: each page with the tooling behind it.
 * Design is the live page; Data is the CMS collection it reads; Code is its source files; API is the calls it makes,
 * the routes they become and the tables underneath. The 3D build map draws the same stack behind every screen.
 */

export type AppLane = "visitor" | "gigster" | "owner" | "email" | "tools";
export type ApiState = "build" | "live" | "clerk" | "sample";

export interface AppPage {
  id: string;
  lane: AppLane;
  title: string;
  /** The route, as linked inside this site (basePath added when opened). */
  path: string;
  text: string;
  files: string[];
  calls: string[];
  emails?: string[];
  /** Sample data to load first, so the page shows what it shows a real visitor. */
  as?: { role: "gigster" | "owner" | "invited"; id?: string };
}

export const lanes: { id: AppLane; name: string; sub: string }[] = [
  { id: "visitor", name: "Visitor", sub: "Public pages" },
  { id: "gigster", name: "Gigster", sub: "Joins, builds a profile" },
  { id: "owner", name: "Owner", sub: "Invites and reviews" },
  { id: "email", name: "Emails", sub: "Sent by the system" },
  { id: "tools", name: "Team tools", sub: "Previews and checks" },
];

const em = (name: string) => [`emails/${name}.ts`, "emails/layout.ts", "components/emails/EmailPreview.tsx"];
const owner = { role: "owner" as const, id: "owner" };

export const appPages: AppPage[] = [
  { id: "home", lane: "visitor", title: "Home: the call sheet", path: "/", text: "Coming soon, with the dotted forest panel and the glowing horizon.", files: ["app/page.tsx", "components/home/CallSheetHome.tsx"], calls: [] },
  { id: "proposal-visitor", lane: "visitor", title: "Home once we open", path: "/proposals/home/", text: "Proposals for the open platform: visitor, Gigster and owner views.", files: ["components/proposals/HomeProposals.tsx"], calls: [] },
  { id: "crew-call", lane: "visitor", title: "Crew Call", path: "/crew-call/", text: "The client's V15 call sheet: embroidered patches, reviews, light and dark. Picking a service opens the planner.", files: ["components/crew-call/CrewCall.tsx", "lib/crew-call.ts"], calls: ["funnel.submitSketch"], emails: ["coming-soon"] },
  { id: "storyboard", lane: "visitor", title: "The Storyboard", path: "/storyboard/", text: "The approved sketchbook with the curling page turn. Its planner saves a request.", files: ["components/funnel/Storyboard.tsx"], calls: ["funnel.submitSketch"], emails: ["coming-soon"] },
  { id: "professionals", lane: "visitor", title: "For professionals", path: "/professionals/", text: "The client's layout: services and sample profiles as grids, each Gigster beside their work.", files: ["components/funnel/ProfessionalsLanding.tsx", "components/funnel/parts.tsx", "components/funnel/Carousel.tsx"], calls: [] },
  { id: "call-sheet-dialog", lane: "visitor", title: "Get on the call sheet", path: "/professionals/", text: "Email and ZIP, then optional details. Joins the waitlist and sends the welcome email.", files: ["components/funnel/CallSheetDialog.tsx"], calls: ["funnel.joinWaitlist", "funnel.addDetails"], emails: ["welcome"] },
  { id: "public-maya", lane: "visitor", title: "Live public profile", path: "/p/maya/", text: "The approved call-sheet profile clients see.", files: ["components/profile/PublicProfile.tsx", "components/profile/ProfileView.tsx"], calls: ["people.getPublic", "people.similar"] },
  { id: "privacy", lane: "visitor", title: "Policies", path: "/privacy/", text: "Privacy, terms, provider standards and licensing, with a request form.", files: ["components/policy/PolicyPage.tsx", "components/policy/PrivacyRequest.tsx"], calls: ["funnel.privacyRequest"] },
  { id: "join-valid", lane: "gigster", title: "Create the account", path: "/join/?invite=riley-7q2m", text: "Invite check, name and terms, then Clerk's email code.", files: ["components/auth/JoinView.tsx", "components/auth/ClerkLayer.tsx"], calls: ["invites.lookup", "auth.syncExternal", "auth.register"], as: { role: "invited" } },
  { id: "login", lane: "gigster", title: "Sign in", path: "/login/", text: "Clerk sign-in, themed to Between Gigs. Owners sign in here too.", files: ["components/auth/LoginView.tsx", "components/auth/ClerkLayer.tsx"], calls: ["auth.session", "auth.requestCode", "auth.verifyCode"], as: { role: "invited" } },
  { id: "builder-steps", lane: "gigster", title: "Build the profile", path: "/profile/edit/", text: "Five autosaved steps with a live card preview that follows each step.", files: ["components/builder/ProfileBuilder.tsx", "components/profile/ProfilePreviewCard.tsx", "components/profile/PhotoPicker.tsx", "components/profile/ChipPicker.tsx", "lib/profile/validate.ts"], calls: ["people.get", "profiles.getDraft", "profiles.saveDraft", "profiles.photo"], as: { role: "gigster", id: "elena-petrova" } },
  { id: "builder-review", lane: "gigster", title: "Review and submit", path: "/profile/edit/?step=review", text: "Everything at a glance, with any owner notes. Submit sends it for review.", files: ["components/builder/ProfileBuilder.tsx", "lib/profile/validate.ts"], calls: ["profiles.submit"], emails: ["profile-submitted"], as: { role: "gigster", id: "hana-kim" } },
  { id: "profile-approved", lane: "gigster", title: "My profile", path: "/profile/", text: "Status, next step and the card clients will see.", files: ["components/profile/MyProfile.tsx", "components/profile/ProfileView.tsx"], calls: ["people.get", "profiles.getProfile"], as: { role: "gigster", id: "maya" } },
  { id: "owner-dashboard", lane: "owner", title: "Dashboard", path: "/owners/", text: "One screen: numbers as tabs, the list in place, activity and the funnel.", files: ["components/owners/OwnerDashboard.tsx", "components/owners/Funnel.tsx", "components/owners/activity.tsx", "components/owners/kit.tsx"], calls: ["owners.dashboard", "owners.waitlist", "people.list"], as: owner },
  { id: "owner-waitlist", lane: "owner", title: "Waitlist", path: "/owners/waitlist/", text: "The ~500 sign-ups. Select people, or all not invited, then Invite N people.", files: ["components/owners/OwnerWaitlist.tsx", "components/owners/kit.tsx"], calls: ["owners.waitlist", "owners.invite"], emails: ["invite"], as: owner },
  { id: "owner-review-queue", lane: "owner", title: "Review queue", path: "/owners/review/", text: "Submitted profiles, oldest first, with tables you can fold away.", files: ["components/owners/ReviewQueue.tsx"], calls: ["owners.reviewQueue", "owners.activity"], as: owner },
  { id: "owner-review", lane: "owner", title: "Review a profile", path: "/owners/people/imani-carter/", text: "Checklist in the pinned bar, Suggest edits or Approve.", files: ["components/owners/OwnerPerson.tsx", "components/owners/ReviewPanel.tsx"], calls: ["people.get", "profiles.getProfile", "owners.approve", "owners.requestChanges", "owners.undoReview"], emails: ["approved", "changes-requested"], as: owner },
  { id: "owner-people", lane: "owner", title: "People", path: "/owners/people/", text: "Search with craft, service, area, availability and profile filters.", files: ["components/owners/OwnerPeople.tsx", "lib/profile/department.ts"], calls: ["people.list"], as: owner },
  { id: "email-welcome", lane: "email", title: "Welcome email", path: "/emails/welcome/", text: "Sent when someone joins the waitlist. Links to the Storyboard.", files: em("welcome"), calls: ["renderEmail"] },
  { id: "email-invite", lane: "email", title: "Invite email", path: "/emails/invite/", text: "Each person's own link: /join?invite=TOKEN, valid 30 days.", files: em("invite"), calls: ["renderEmail"] },
  { id: "email-submitted", lane: "email", title: "Profile submitted email", path: "/emails/profile-submitted/", text: "Confirms the submit, with links to the profile and the editor.", files: em("profile-submitted"), calls: ["renderEmail"] },
  { id: "email-changes", lane: "email", title: "Changes requested email", path: "/emails/changes-requested/", text: "Each owner note under its section, with Update my profile.", files: em("changes-requested"), calls: ["renderEmail"] },
  { id: "email-approved", lane: "email", title: "Approved email", path: "/emails/approved/", text: "You're on the call sheet. Links to the live profile.", files: em("approved"), calls: ["renderEmail"] },
  { id: "emails", lane: "tools", title: "Every email", path: "/emails/", text: "Seven templates with full-height previews and the sample outbox.", files: ["components/emails/EmailsIndex.tsx"], calls: ["emails.outbox"] },
  { id: "preview-guide", lane: "tools", title: "Preview guide", path: "/preview/", text: "Try every role, with thumbnails, in grid or list.", files: ["components/home/Overview.tsx"], calls: ["demo.signInAs", "auth.signOut"] },
];

/** Each data call: the API route it becomes, the tables under it, and how far along it is. */
export const api: Record<string, [route: string, tables: string[], state: ApiState]> = {
  "auth.session": ["GET /api/session", ["people"], "build"],
  "auth.syncExternal": ["POST /api/session/sync", ["people", "invites"], "build"],
  "auth.signOut": ["Clerk signOut()", [], "clerk"],
  "auth.register": ["Clerk sign-up (sample only today)", [], "clerk"],
  "auth.requestCode": ["Clerk sends the code (sample only today)", [], "clerk"],
  "auth.verifyCode": ["Clerk checks the code (sample only today)", [], "clerk"],
  "invites.lookup": ["GET /api/invites/:token", ["invites"], "build"],
  "profiles.getDraft": ["GET /api/profile/draft", ["profile_drafts"], "build"],
  "profiles.saveDraft": ["PUT /api/profile/draft", ["profile_drafts", "people"], "build"],
  "profiles.photo": ["POST /api/profile/photo", ["R2 photos"], "build"],
  "profiles.submit": ["POST /api/profile/submit", ["profiles", "people", "review_notes", "welcome_email_outbox"], "build"],
  "profiles.getProfile": ["GET /api/profile", ["profiles"], "build"],
  "people.get": ["GET /api/people/:id", ["people", "profiles"], "build"],
  "people.getPublic": ["GET /api/p/:slug", ["people", "profiles"], "build"],
  "people.similar": ["GET /api/p/:slug/similar", ["people", "profiles"], "build"],
  "people.list": ["GET /api/people", ["people", "profiles", "profile_drafts"], "build"],
  "owners.dashboard": ["GET /api/owners/dashboard", ["people", "leads", "invites", "activity"], "build"],
  "owners.activity": ["GET /api/owners/activity", ["activity"], "build"],
  "owners.reviewQueue": ["GET /api/owners/review-queue", ["people", "profiles"], "build"],
  "owners.approve": ["POST /api/owners/people/:id/approve", ["people", "review_notes", "activity", "welcome_email_outbox"], "build"],
  "owners.requestChanges": ["POST /api/owners/people/:id/request-changes", ["people", "review_notes", "activity", "welcome_email_outbox"], "build"],
  "owners.undoReview": ["POST /api/owners/people/:id/undo-review", ["people", "review_notes", "activity", "welcome_email_outbox"], "build"],
  "owners.waitlist": ["GET /api/owners/waitlist", ["leads", "people", "invites"], "build"],
  "owners.invite": ["POST /api/owners/invite", ["people", "invites", "activity", "welcome_email_outbox"], "build"],
  "funnel.joinWaitlist": ["POST /api/professionals3", ["leads", "form_responses", "welcome_email_outbox"], "live"],
  "funnel.addDetails": ["POST /api/professionals3/details", ["leads", "form_responses"], "live"],
  "funnel.submitSketch": ["POST /api/sketches", ["sketches", "welcome_email_outbox"], "live"],
  "funnel.privacyRequest": ["POST /api/privacy-requests", ["privacy_requests"], "live"],
  "emails.outbox": ["Sample tooling, not needed live", [], "sample"],
  "demo.signInAs": ["Sample only: the Preview guide", [], "sample"],
  "renderEmail": ["Outbox drain: drainWelcomeEmails()", ["welcome_email_outbox"], "build"],
};

/** Tables the backend adds; the rest exist today. */
export const newTables = new Set(["people", "invites", "profile_drafts", "profiles", "review_notes", "activity", "R2 photos"]);
export const apiStateLabel: Record<ApiState, string> = { build: "To build", live: "Live today", clerk: "Clerk", sample: "Sample only" };

/** The Studio collection that holds a page's content, if any. */
export function collectionFor(p: AppPage): string | null {
  // Pages whose content is the service catalogue, whatever they also send.
  if (p.id === "crew-call" || p.id === "professionals" || p.id === "proposal-visitor") return "services";
  const c = p.calls.join(" ");
  if (/people\.|profiles\.|owners\.(reviewQueue|approve|requestChanges|undoReview|dashboard)/.test(c)) return "gigsters";
  if (/owners\.(waitlist|invite)|funnel\.(joinWaitlist|addDetails)/.test(c)) return "waitlist";
  if (/funnel\.submitSketch/.test(c)) return "storyboard";
  return null;
}

/** Where a source file lives on GitHub. */
/** Who a preview frame shows the page as (see the bg-preview frame name in lib/data/sample.ts). */
export const previewAs = (p: AppPage) => !p.as ? "visitor" : p.as.role === "gigster" ? `gigster:${p.as.id}` : p.as.role;
export const previewLabel = (p: AppPage) => !p.as ? "Visitor, signed out" : p.as.role === "owner" ? "The owner" : p.as.role === "invited" ? "Invited visitor"
  : `${(p.as.id ?? "").split("-")[0].replace(/^./, (c) => c.toUpperCase())}, a Gigster`;

export const githubUrl = (file: string) => `https://github.com/between-gigs/between-gig-2.0/blob/main/${file}`;
