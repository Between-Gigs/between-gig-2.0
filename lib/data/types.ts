/*
 * Between Gigs 2.0 data model. These types are the contract between the UI and the backend.
 * The sample implementation (./sample.ts) keeps them in localStorage; Anu's implementation maps them
 * to Cloudflare D1, Clerk sign-in and the Resend outbox. See docs/handoff/data-layer.md.
 */

/** Where a Gigster is on the way from waitlist to a public profile. Order matters: it is the funnel. */
export type PersonStatus = "invited" | "registered" | "draft" | "submitted" | "changes_requested" | "approved";

export const personStatuses: PersonStatus[] = ["invited", "registered", "draft", "submitted", "changes_requested", "approved"];

export type Role = "gigster" | "owner";

/** A person from the waitlist, from the moment they are invited. */
export interface Person {
  id: string;
  email: string;
  /** Empty until they register. */
  name: string;
  /** Public URL handle, /p/[slug]. Set at registration, from the name. */
  slug: string;
  status: PersonStatus;
  /** ZIP from the waitlist sign-up ("Get on the call sheet"). */
  waitlistZip: string;
  /** Service category picked at sign-up (lib/data/taxonomy.ts → waitlistCategories), if any. */
  waitlistCategory: string;
  invitedAt: string;
  registeredAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  updatedAt: string;
  /** The owners' notes when status is changes_requested. One short note per section, no threads. */
  reviewNotes?: ReviewNote[];
  /** Marks seed people so the UI can label them as fictional. Real records leave it unset. */
  sample?: boolean;
}

export type ProfileSection = "about" | "skills" | "where" | "story";

export interface ReviewNote {
  section: ProfileSection;
  note: string;
  /** Who wrote it, e.g. "Owner (sample)". */
  by: string;
  at: string;
}

export type Market = "la" | "other";
export type MonthStatus = "available" | "limited" | "away";
export type RateBasis = "hourly" | "project" | "day";
export type InsuranceAnswer = "private" | "yes" | "no";
export type WorkMode = "on-site" | "studio" | "both";

/**
 * The questionnaire (profile builder), field for field. Fields and copy follow the design system's
 * GigsterOnboarding template (the client's prototype C).
 */
export interface ProfileFields {
  /** A data URL in the sample (resized to 480px); a storage URL in production. */
  photo: string;
  name: string;
  years: string;
  position: string;
  imdb: string;
  credits: string[];
  skills: string[];
  services: string[];
  other: string;
  market: Market;
  otherCity: string;
  zip: string;
  areas: string[];
  travel: string;
  month: string;
  monthStatus: MonthStatus;
  dates: string;
  rate: string;
  basis: RateBasis;
  about: string;
  languages: string;
  insurance: InsuranceAnswer;
  tools: string;
  transport: string;
  mode: WorkMode;
}

/** The person's working copy: what the builder autosaves. */
export interface ProfileDraft {
  personId: string;
  fields: ProfileFields;
  /** Builder step to resume at (0 to 4). */
  step: number;
  savedAt: string;
}

/** A submitted (and later approved) profile: a frozen copy of the draft at submit time. */
export interface Profile {
  personId: string;
  fields: ProfileFields;
  submittedAt: string;
  /** Sample people only: portfolio images and an area tag that the questionnaire doesn't collect yet. */
  extras?: { portfolio: { src: string; caption: string }[]; tagline: string; helps: string[] };
}

export type InviteState = "valid" | "used" | "expired" | "unknown";

export interface Invite {
  token: string;
  personId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  /** First time the invite link was opened. Drives "Opened" on the waitlist. */
  openedAt?: string;
}

export interface InviteLookup {
  state: InviteState;
  invite?: Invite;
  person?: Person;
}

export interface Session {
  personId: string | null;
  email: string;
  role: Role;
  name: string;
  startedAt: string;
  /** Set when an external sign-in provider (Clerk) opened this session, so its sign-out closes it too. */
  via?: "clerk";
}

/** A verified identity handed over by Clerk: the email is already proven by Clerk's email code. */
export interface ExternalIdentity {
  email: string;
  name?: string;
  /** From Clerk publicMetadata.role, which only the dashboard or a server can set. */
  role?: "owner";
  /** The invite the person signed up from (Clerk unsafeMetadata), if any. */
  inviteToken?: string;
  acceptedTerms?: boolean;
}

export type SyncExternalResult =
  | { ok: true; session: Session; created: boolean }
  | { ok: false; error: "unknown-email" | "invite-mismatch" };

export type SignInResult =
  | { ok: true; session: Session }
  | { ok: false; error: "wrong-code" | "expired-code" | "too-many-attempts" | "no-code" };

export type RequestCodeResult =
  | { ok: true; email: string; expiresAt: string }
  | { ok: false; error: "unknown-email" | "not-registered" | "rate-limited" };

export type RegisterResult =
  | { ok: true; person: Person }
  | { ok: false; error: InviteState | "terms" | "name" | "email" | "existing-account" };

export type EmailTemplate = "invite" | "sign-in-code" | "profile-submitted" | "welcome" | "coming-soon" | "approved" | "changes-requested";

/** A queued email. Production: a row in the Resend outbox, sent by the existing worker. */
export interface OutboxEmail {
  id: string;
  template: EmailTemplate;
  to: string;
  subject: string;
  /** The template's props, so the preview can render exactly what was queued. */
  props: Record<string, string>;
  status: "queued" | "sent";
  createdAt: string;
}

export type PeopleSort = "updated" | "name" | "status";

export interface PeopleQuery {
  text?: string;
  status?: PersonStatus | "all";
  service?: string | "all";
  area?: string | "all";
  availability?: MonthStatus | "all";
  /** A craft from lib/profile/department.ts `crafts`, matched on position and skills. */
  craft?: string | "all";
  /** How far the profile has got: every required answer in, something missing, or no photo yet. */
  profile?: ProfileFilter;
  sort?: PeopleSort;
}

export type ProfileFilter = "all" | "complete" | "missing" | "no-photo";

/** One row in the owner's people list: the person plus the parts of their profile worth searching. */
export interface PersonSummary {
  person: Person;
  /** Submitted profile if there is one, else the draft, else null. */
  fields: ProfileFields | null;
  /** True when fields come from an unsubmitted draft. */
  fromDraft: boolean;
  /** How much of the questionnaire is filled, 0 to 1. */
  completeness: number;
}

/* ---- Milestone 3: the public funnel ---- */

/** "Get on the call sheet" on /professionals. Production: D1 `leads` (+ `form_responses`), welcome email queued. */
export interface WaitlistSignup {
  id: string;
  email: string;
  zip: string;
  /** A waitlistCategories id (lib/data/taxonomy.ts), from a service card, a sample profile or step 2. */
  category: string;
  /** Step 2's "What would you offer?" (optional). */
  details: string;
  /** Which button opened the dialog: hero, nav, service, profile-maya, footer… (the old analytics placement). */
  placement: string;
  createdAt: string;
}

export type WaitlistResult =
  | { ok: true; signup: WaitlistSignup; alreadyJoined: boolean }
  | { ok: false; error: "email" | "zip" };

export type SketchKind = "talent" | "buyer";

/** A Storyboard form: talent ("Offer your skills") or buyer ("Find talent for a project"). Production: D1 `sketches`. */
export interface SketchSubmission {
  id: string;
  kind: SketchKind;
  name: string;
  email: string;
  /** Every other answer, keyed by field name (role, services, location, availability, rate, project, timing, team_size, budget, details). */
  answers: Record<string, string>;
  createdAt: string;
}

/** The privacy page's contact form. Production: D1 `privacy_requests`. */
export interface PrivacyRequest { id: string; email: string; message: string; createdAt: string }

/* ---- Milestone 4: the owners' tools ---- */

/** Where a waitlist sign-up is with their invite. */
export type InviteStatus = "not_invited" | "invited" | "opened" | "registered";
export const inviteStatuses: InviteStatus[] = ["not_invited", "invited", "opened", "registered"];

export interface WaitlistRow {
  signup: WaitlistSignup;
  inviteStatus: InviteStatus;
  /** Set once invited. */
  personId?: string;
  invitedAt?: string;
}

export interface WaitlistQuery {
  text?: string;
  inviteStatus?: InviteStatus | "all";
  category?: string | "all";
  sort?: "joined-new" | "joined-old" | "email" | "zip";
}

export type ActivityKind = "joined_waitlist" | "invited" | "opened" | "registered" | "submitted" | "approved" | "changes_requested";

/** One line in "Recent activity". Production: an events table written by each API action. */
export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  personId?: string;
  /** Name if known, else the email. */
  who: string;
  /** The owner who acted (approve, suggest edits, invite). */
  by?: string;
  at: string;
}

/**
 * The waitlist-to-live funnel. Each stage counts everyone who ever reached it, so each is a subset of the one
 * before: invited = every sign-up that got an invite; opened = opened the invite link or went further; and so on.
 */
export interface FunnelCounts {
  /** Everyone on the call sheet. */
  signups: number;
  /** Ever invited (any invite status but not_invited). */
  invited: number;
  /** Opened their invite link, or created an account without a recorded open. */
  opened: number;
  /** Created an account (any person status after invited). */
  accounts: number;
  /** Submitted a profile at least once (submitted, changes requested or approved). */
  submitted: number;
  approved: number;
}

export interface DashboardSummary {
  /** People by their current status (each person counted once, where they are now). */
  counts: Record<PersonStatus, number>;
  /** Cumulative stages, for the funnel. */
  funnel: FunnelCounts;
  waitlist: Record<InviteStatus, number> & { total: number };
  /** Submitted profiles, oldest first. */
  reviewQueue: PersonSummary[];
  activity: ActivityEvent[];
}

export type ReviewNoteInput = { section: ProfileSection; note: string };
