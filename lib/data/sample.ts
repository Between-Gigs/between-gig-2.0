/*
 * The sample DataSource: the whole backend, faked in the browser. State lives in localStorage under
 * one key, seeded from ./seed.ts, and survives reloads until it is reset (QA, or clearing site data).
 * Nothing leaves the browser: "sent" emails land in a local outbox you can open at /emails.
 */
import { renderEmail } from "@/emails";
import { craftOf } from "@/lib/profile/department";
import { completeness, validateAll } from "@/lib/profile/validate";
import { absoluteUrl } from "@/lib/site";
import { blankFields, buildActivity, buildSeed, buildWaitlist, DEMO_TOKENS, SAMPLE_OWNER, type SeedState } from "./seed";
import type { DataSource } from "./source";
import type {
  EmailTemplate, Invite, InviteLookup, OutboxEmail, PeopleQuery, Person, PersonStatus, PersonSummary, Profile,
  PrivacyRequest, ProfileDraft, Role, Session, SketchSubmission, WaitlistSignup,
  ActivityEvent, ActivityKind, InviteStatus, WaitlistRow, ExternalIdentity, SyncExternalResult,
} from "./types";
import { inviteStatuses } from "./types";
import { personStatuses } from "./types";

// v2: Milestone 4 added the waitlist and activity log. A new key resets older demo data.
const KEY = "bg2-sample-v2";
const CHANGE = "bg2-sample-change";
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

interface Challenge { email: string; code: string; expiresAt: string; sentAt: string; attempts: number }

interface State extends SeedState {
  outbox: OutboxEmail[];
  waitlist?: WaitlistSignup[];
  sketches?: SketchSubmission[];
  privacy?: PrivacyRequest[];
  activity?: ActivityEvent[];
  session: Session | null;
  challenges: Challenge[];
}

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
/** A short pause so loading states are real, as they will be over the network. */
const latency = (ms = 60) => new Promise((r) => setTimeout(r, ms));

function fresh(): State {
  const seed = buildSeed();
  return { ...seed, outbox: [], session: null, challenges: [], waitlist: buildWaitlist(seed.people), activity: buildActivity(seed.people) };
}

function log(state: State, kind: ActivityKind, who: { personId?: string; name?: string; email: string }, by?: string) {
  state.activity ??= [];
  state.activity.unshift({ id: uid(), kind, personId: who.personId, who: who.name || who.email, by, at: now() });
}

function inviteStatusOf(state: State, email: string): { status: InviteStatus; personId?: string; invitedAt?: string } {
  const person = state.people.find((p) => p.email.toLowerCase() === email.toLowerCase());
  if (!person) return { status: "not_invited" };
  if (person.status !== "invited") return { status: "registered", personId: person.id, invitedAt: person.invitedAt };
  const opened = state.invites.some((i) => i.personId === person.id && i.openedAt);
  return { status: opened ? "opened" : "invited", personId: person.id, invitedAt: person.invitedAt };
}

const ownerName = (state: State) => (state.session?.role === "owner" ? state.session.name : SAMPLE_OWNER.name);

let memory: State | null = null;

function load(): State {
  if (memory) return memory;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    memory = raw ? (JSON.parse(raw) as State) : fresh();
  } catch {
    memory = fresh();
  }
  return memory;
}

function save(state: State, sessionChanged = false) {
  memory = state;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked: keep the in-memory copy */ }
  if (sessionChanged && typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE));
}

/** Other tabs change the store too; drop the cached copy when they do. */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) { memory = null; window.dispatchEvent(new Event(CHANGE)); }
  });
}

const slugify = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gigster";

function uniqueSlug(state: State, name: string, selfId: string) {
  const base = slugify(name);
  let slug = base;
  for (let n = 2; state.people.some((p) => p.slug === slug && p.id !== selfId); n++) slug = `${base}-${n}`;
  return slug;
}

function summarize(state: State, person: Person): PersonSummary {
  const profile = state.profiles.find((p) => p.personId === person.id);
  const draft = state.drafts.find((d) => d.personId === person.id);
  // Owners see the submitted version while a review is pending; the draft only before first submit.
  const fields = profile?.fields ?? draft?.fields ?? null;
  return { person: clone(person), fields: fields ? clone(fields) : null, fromDraft: !profile && !!draft, completeness: completeness(fields) };
}

function matches(s: PersonSummary, q: PeopleQuery) {
  const f = s.fields;
  if (q.status && q.status !== "all" && s.person.status !== q.status) return false;
  if (q.service && q.service !== "all" && !f?.services.includes(q.service)) return false;
  if (q.area && q.area !== "all" && !f?.areas.includes(q.area)) return false;
  if (q.availability && q.availability !== "all" && f?.monthStatus !== q.availability) return false;
  if (q.craft && q.craft !== "all" && craftOf(f?.position, f?.skills) !== q.craft) return false;
  if (q.profile === "complete" && s.completeness < 1) return false;
  if (q.profile === "missing" && s.completeness >= 1) return false;
  if (q.profile === "no-photo" && f?.photo) return false;
  const text = q.text?.trim().toLowerCase();
  if (text) {
    const hay = [s.person.name, s.person.email, s.person.waitlistZip, f?.position, f?.about, ...(f?.services ?? []), ...(f?.skills ?? []), ...(f?.areas ?? [])]
      .filter(Boolean).join(" ").toLowerCase();
    if (!text.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

function queue(state: State, template: EmailTemplate, to: string, props: Record<string, string>): OutboxEmail {
  const { subject } = renderEmail(template, props);
  const email: OutboxEmail = { id: uid(), template, to, subject, props, status: "queued", createdAt: now() };
  state.outbox.unshift(email);
  return email;
}

function sessionFor(person: Person): Session {
  return { personId: person.id, email: person.email, role: "gigster", name: person.name, startedAt: now() };
}

const ownerSession = (): Session => ({ personId: null, email: SAMPLE_OWNER.email, role: "owner", name: SAMPLE_OWNER.name, startedAt: now() });

function lookupInvite(state: State, token: string): InviteLookup {
  const invite = state.invites.find((i) => i.token === token.trim());
  if (!invite) return { state: "unknown" };
  const person = state.people.find((p) => p.id === invite.personId);
  if (invite.usedAt) return { state: "used", invite: clone(invite), person: person && clone(person) };
  if (new Date(invite.expiresAt).getTime() < Date.now()) return { state: "expired", invite: clone(invite), person: person && clone(person) };
  return { state: "valid", invite: clone(invite), person: person && clone(person) };
}

export const sampleSource: DataSource = {
  kind: "sample",

  people: {
    async list(query = {}) {
      await latency();
      const state = load();
      const rank = (s: PersonStatus) => personStatuses.indexOf(s);
      const rows = state.people.map((p) => summarize(state, p)).filter((s) => matches(s, query));
      const sort = query.sort ?? "updated";
      rows.sort((a, b) =>
        sort === "name" ? (a.person.name || a.person.email).localeCompare(b.person.name || b.person.email)
        : sort === "status" ? rank(b.person.status) - rank(a.person.status) || b.person.updatedAt.localeCompare(a.person.updatedAt)
        : b.person.updatedAt.localeCompare(a.person.updatedAt));
      return rows;
    },
    async get(id) {
      await latency();
      const state = load();
      const person = state.people.find((p) => p.id === id);
      return person ? summarize(state, person) : null;
    },
    async getPublic(slug) {
      await latency();
      const state = load();
      const person = state.people.find((p) => p.slug === slug && p.slug !== "");
      if (!person) return { person: null, profile: null };
      const profile = person.status === "approved" ? state.profiles.find((p) => p.personId === person.id) ?? null : null;
      return { person: clone(person), profile: profile && clone(profile) };
    },
    async similar(id, limit = 3) {
      await latency(0);
      const state = load();
      return state.people
        .filter((p) => p.id !== id && p.status === "approved")
        .map((person) => ({ person, profile: state.profiles.find((x) => x.personId === person.id) }))
        .filter((x): x is { person: Person; profile: Profile } => !!x.profile)
        .sort((a, b) => Number(!!b.profile.fields.photo) - Number(!!a.profile.fields.photo))
        .slice(0, limit)
        .map(clone);
    },
  },

  invites: {
    async lookup(token) {
      await latency();
      const state = load();
      const found = lookupInvite(state, token);
      const invite = state.invites.find((i) => i.token === token.trim());
      if (found.state === "valid" && invite && !invite.openedAt) {
        invite.openedAt = now();
        log(state, "opened", { personId: invite.personId, email: invite.email });
        save(state);
      }
      return found;
    },
  },

  auth: {
    async session() {
      return clone(load().session);
    },
    async register({ token, name, acceptTerms }) {
      await latency(200);
      const state = load();
      const found = lookupInvite(state, token);
      if (found.state !== "valid" || !found.invite) return { ok: false, error: found.state };
      if (!name.trim()) return { ok: false, error: "name" };
      if (!acceptTerms) return { ok: false, error: "terms" };
      const person = state.people.find((p) => p.id === found.invite!.personId)!;
      const t = now();
      person.name = name.trim().replace(/\s+/g, " ");
      person.slug = uniqueSlug(state, person.name, person.id);
      person.status = "registered";
      person.registeredAt = t;
      person.updatedAt = t;
      state.invites.find((i) => i.token === token)!.usedAt = t;
      log(state, "registered", { personId: person.id, name: person.name, email: person.email });
      state.session = sessionFor(person);
      save(state, true);
      return { ok: true, person: clone(person) };
    },
    async requestCode(email) {
      await latency(200);
      const state = load();
      const address = email.trim().toLowerCase();
      const isOwner = address === SAMPLE_OWNER.email;
      const person = state.people.find((p) => p.email.toLowerCase() === address);
      if (!isOwner && !person) return { ok: false, error: "unknown-email" };
      if (!isOwner && person?.status === "invited") return { ok: false, error: "not-registered" };
      const prev = state.challenges.find((c) => c.email === address);
      if (prev && Date.now() - new Date(prev.sentAt).getTime() < RESEND_AFTER_MS) return { ok: false, error: "rate-limited" };
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const challenge: Challenge = { email: address, code, sentAt: now(), expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(), attempts: 0 };
      state.challenges = [...state.challenges.filter((c) => c.email !== address), challenge];
      queue(state, "sign-in-code", address, { code, email: address, minutes: String(CODE_TTL_MS / 60000) });
      save(state);
      return { ok: true, email: address, expiresAt: challenge.expiresAt };
    },
    async verifyCode(email, code) {
      await latency(200);
      const state = load();
      const address = email.trim().toLowerCase();
      const c = state.challenges.find((x) => x.email === address);
      if (!c) return { ok: false, error: "no-code" };
      if (c.attempts >= MAX_ATTEMPTS) return { ok: false, error: "too-many-attempts" };
      if (new Date(c.expiresAt).getTime() < Date.now()) return { ok: false, error: "expired-code" };
      if (c.code !== code.trim()) {
        c.attempts++;
        save(state);
        return { ok: false, error: c.attempts >= MAX_ATTEMPTS ? "too-many-attempts" : "wrong-code" };
      }
      state.challenges = state.challenges.filter((x) => x !== c);
      const person = state.people.find((p) => p.email.toLowerCase() === address);
      state.session = person ? sessionFor(person) : ownerSession();
      save(state, true);
      return { ok: true, session: clone(state.session) };
    },
    async syncExternal(identity: ExternalIdentity): Promise<SyncExternalResult> {
      const state = load();
      const address = identity.email.trim().toLowerCase();
      if (identity.role === "owner") {
        state.session = { ...ownerSession(), email: address, name: identity.name || SAMPLE_OWNER.name, via: "clerk" };
        save(state, true);
        return { ok: true, session: clone(state.session), created: false };
      }
      const person = state.people.find((p) => p.email.toLowerCase() === address);
      if (!person) return { ok: false, error: "unknown-email" };
      let created = false;
      if (person.status === "invited") {
        // First sign-in after a Clerk sign-up: use the invite, the same as register() does.
        const invite = state.invites.find((i) => i.personId === person.id && !i.usedAt);
        if (identity.inviteToken && invite && invite.token !== identity.inviteToken) return { ok: false, error: "invite-mismatch" };
        const t = now();
        if (identity.name?.trim()) {
          person.name = identity.name.trim().replace(/\s+/g, " ");
          person.slug = uniqueSlug(state, person.name, person.id);
        }
        person.status = "registered";
        person.registeredAt = t;
        person.updatedAt = t;
        if (invite) invite.usedAt = t;
        log(state, "registered", { personId: person.id, name: person.name, email: person.email });
        created = true;
      }
      state.session = { ...sessionFor(person), via: "clerk" };
      save(state, true);
      return { ok: true, session: clone(state.session), created };
    },
    async signOut() {
      const state = load();
      state.session = null;
      save(state, true);
    },
    onChange(listener) {
      if (typeof window === "undefined") return () => {};
      window.addEventListener(CHANGE, listener);
      return () => window.removeEventListener(CHANGE, listener);
    },
  },

  profiles: {
    async getDraft(personId) {
      await latency();
      const state = load();
      const draft = state.drafts.find((d) => d.personId === personId);
      if (draft) return clone(draft);
      const person = state.people.find((p) => p.id === personId);
      return person ? { personId, fields: blankFields(person.name), step: 0, savedAt: "" } : null;
    },
    async saveDraft(personId, fields, step) {
      await latency(120);
      const state = load();
      const person = state.people.find((p) => p.id === personId);
      if (!person) throw new Error("No such person");
      const draft: ProfileDraft = { personId, fields: clone(fields), step, savedAt: now() };
      state.drafts = [...state.drafts.filter((d) => d.personId !== personId), draft];
      if (person.status === "registered") person.status = "draft";
      // The profile name follows the questionnaire's "Full name" until it's submitted.
      if (fields.name.trim() && (person.status === "draft")) person.name = fields.name.trim();
      person.updatedAt = draft.savedAt;
      save(state);
      return clone(draft);
    },
    async submit(personId) {
      await latency(300);
      const state = load();
      const person = state.people.find((p) => p.id === personId);
      const draft = state.drafts.find((d) => d.personId === personId);
      if (!person || !draft) throw new Error("Nothing to submit");
      if (Object.keys(validateAll(draft.fields)).length) throw new Error("The profile has fields that need attention");
      const t = now();
      const previous = state.profiles.find((p) => p.personId === personId);
      const profile: Profile = { personId, fields: clone(draft.fields), submittedAt: t, extras: previous?.extras };
      state.profiles = [...state.profiles.filter((p) => p.personId !== personId), profile];
      person.name = draft.fields.name.trim();
      if (!person.slug) person.slug = uniqueSlug(state, person.name, person.id);
      person.status = "submitted";
      person.submittedAt = t;
      person.updatedAt = t;
      person.reviewNotes = undefined;
      log(state, "submitted", { personId: person.id, name: person.name, email: person.email });
      queue(state, "profile-submitted", person.email, {
        firstName: person.name.split(" ")[0] ?? "",
        profileUrl: absoluteUrl("/profile/"),
        editUrl: absoluteUrl("/profile/edit/"),
      });
      if (state.session?.personId === personId) state.session.name = person.name;
      save(state, true);
      return { person: clone(person), profile: clone(profile) };
    },
    async getProfile(personId) {
      await latency();
      const p = load().profiles.find((x) => x.personId === personId);
      return p ? clone(p) : null;
    },
  },

  emails: {
    async outbox() {
      await latency(0);
      return clone(load().outbox);
    },
    async get(id) {
      await latency(0);
      return clone(load().outbox.find((e) => e.id === id) ?? null);
    },
    async queue(template, to, props) {
      const state = load();
      const email = queue(state, template, to, props);
      save(state);
      return clone(email);
    },
  },

  funnel: {
    async joinWaitlist({ email, zip, category = "", placement }) {
      await latency(250);
      const address = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { ok: false, error: "email" };
      if (!/^\d{5}$/.test(zip)) return { ok: false, error: "zip" };
      const state = load();
      state.waitlist ??= [];
      // Joining twice is fine: keep the first signup (like leads.email in D1), no second welcome email.
      const existing = state.waitlist.find((w) => w.email === address);
      if (existing) return { ok: true, signup: clone(existing), alreadyJoined: true };
      const signup: WaitlistSignup = { id: uid(), email: address, zip, category, details: "", placement, createdAt: now() };
      state.waitlist.unshift(signup);
      log(state, "joined_waitlist", { email: address });
      queue(state, "welcome", address, { storyboardUrl: absoluteUrl("/storyboard/") });
      save(state);
      return { ok: true, signup: clone(signup), alreadyJoined: false };
    },
    async addDetails(signupId, { category, details }) {
      await latency(200);
      const state = load();
      const signup = state.waitlist?.find((w) => w.id === signupId);
      if (!signup) throw new Error("Unknown signup");
      signup.category = category || signup.category;
      signup.details = details.trim();
      save(state);
      return clone(signup);
    },
    async submitSketch(kind, answers) {
      await latency(250);
      const state = load();
      state.sketches ??= [];
      const { name = "", email = "", ...rest } = answers;
      const sketch: SketchSubmission = { id: uid(), kind, name: name.trim(), email: email.trim().toLowerCase(), answers: rest, createdAt: now() };
      state.sketches.unshift(sketch);
      queue(state, "coming-soon", sketch.email, { kind });
      save(state);
      return clone(sketch);
    },
    async privacyRequest(email, message) {
      await latency(200);
      const state = load();
      state.privacy ??= [];
      const request: PrivacyRequest = { id: uid(), email: email.trim().toLowerCase(), message: message.trim(), createdAt: now() };
      state.privacy.unshift(request);
      save(state);
      return clone(request);
    },
  },

  owners: {
    async dashboard() {
      await latency();
      const state = load();
      const counts = Object.fromEntries(personStatuses.map((st) => [st, state.people.filter((p) => p.status === st).length])) as Record<PersonStatus, number>;
      const waitlist = Object.fromEntries(inviteStatuses.map((st) => [st, 0])) as Record<InviteStatus, number> & { total: number };
      for (const w of state.waitlist ?? []) waitlist[inviteStatusOf(state, w.email).status]++;
      waitlist.total = state.waitlist?.length ?? 0;
      const sent = ["submitted", "changes_requested", "approved"];
      const funnel = {
        signups: waitlist.total,
        invited: waitlist.total - waitlist.not_invited,
        opened: waitlist.opened + waitlist.registered,
        accounts: waitlist.registered,
        submitted: state.people.filter((p) => p.status !== "invited" && (sent.includes(p.status) || !!p.submittedAt)).length,
        approved: counts.approved,
      };
      return { counts, funnel, waitlist, reviewQueue: await sampleSource.owners.reviewQueue(), activity: clone((state.activity ?? []).slice(0, 12)) };
    },
    async activity(limit = 50) {
      await latency(0);
      return clone((load().activity ?? []).slice(0, limit));
    },
    async reviewQueue() {
      await latency(0);
      const state = load();
      return state.people.filter((p) => p.status === "submitted")
        .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""))
        .map((p) => summarize(state, p));
    },
    async approve(personId) {
      await latency(250);
      const state = load();
      const person = state.people.find((p) => p.id === personId);
      if (!person || person.status !== "submitted") throw new Error("Only submitted profiles can be approved");
      const t = now();
      Object.assign(person, { status: "approved", approvedAt: t, updatedAt: t, reviewNotes: undefined });
      log(state, "approved", { personId, name: person.name, email: person.email }, ownerName(state));
      queue(state, "approved", person.email, {
        firstName: person.name.split(" ")[0] ?? "", profileUrl: absoluteUrl(`/p/${person.slug}/`), editUrl: absoluteUrl("/profile/edit/"),
      });
      save(state);
      return clone(person);
    },
    async requestChanges(personId, notes) {
      await latency(250);
      const state = load();
      const person = state.people.find((p) => p.id === personId);
      const clean = notes.map((n) => ({ ...n, note: n.note.trim() })).filter((n) => n.note);
      if (!person || person.status !== "submitted") throw new Error("Only submitted profiles can be sent back");
      if (!clean.length) throw new Error("Add at least one note");
      const t = now();
      const by = ownerName(state);
      Object.assign(person, { status: "changes_requested", updatedAt: t, reviewNotes: clean.map((n) => ({ ...n, by, at: t })) });
      log(state, "changes_requested", { personId, name: person.name, email: person.email }, by);
      queue(state, "changes-requested", person.email, {
        firstName: person.name.split(" ")[0] ?? "",
        // Email props are strings: one note per line, "section|note".
        notes: clean.map((n) => `${n.section}|${n.note.replace(/\n/g, " ")}`).join("\n"),
        editUrl: absoluteUrl("/profile/edit/?step=review"),
      });
      save(state);
      return clone(person);
    },
    async undoReview(personId) {
      await latency(150);
      const state = load();
      const person = state.people.find((p) => p.id === personId);
      if (!person || (person.status !== "approved" && person.status !== "changes_requested")) throw new Error("Nothing to undo");
      const kind: ActivityKind = person.status === "approved" ? "approved" : "changes_requested";
      const template: EmailTemplate = person.status === "approved" ? "approved" : "changes-requested";
      Object.assign(person, { status: "submitted", approvedAt: undefined, reviewNotes: undefined, updatedAt: person.submittedAt ?? now() });
      const event = state.activity?.findIndex((e) => e.personId === personId && e.kind === kind) ?? -1;
      if (event >= 0) state.activity!.splice(event, 1);
      const email = state.outbox.findIndex((e) => e.to === person.email && e.template === template && e.status === "queued");
      if (email >= 0) state.outbox.splice(email, 1);
      save(state);
      return clone(person);
    },
    async waitlist(query = {}) {
      await latency();
      const state = load();
      const text = query.text?.trim().toLowerCase();
      const rows: WaitlistRow[] = (state.waitlist ?? []).map((signup) => {
        const s = inviteStatusOf(state, signup.email);
        return { signup: clone(signup), inviteStatus: s.status, personId: s.personId, invitedAt: s.invitedAt };
      }).filter((r) =>
        (!query.inviteStatus || query.inviteStatus === "all" || r.inviteStatus === query.inviteStatus)
        && (!query.category || query.category === "all" || r.signup.category === query.category)
        && (!text || `${r.signup.email} ${r.signup.zip} ${r.signup.details}`.toLowerCase().includes(text)));
      const sort = query.sort ?? "joined-new";
      rows.sort((a, b) => sort === "email" ? a.signup.email.localeCompare(b.signup.email)
        : sort === "zip" ? a.signup.zip.localeCompare(b.signup.zip) || a.signup.email.localeCompare(b.signup.email)
        : sort === "joined-old" ? a.signup.createdAt.localeCompare(b.signup.createdAt)
        : b.signup.createdAt.localeCompare(a.signup.createdAt));
      return rows;
    },
    async invite(signupIds) {
      await latency(300);
      const state = load();
      let invited = 0, skipped = 0;
      const by = ownerName(state);
      for (const id of signupIds) {
        const signup = state.waitlist?.find((w) => w.id === id);
        if (!signup || inviteStatusOf(state, signup.email).status !== "not_invited") { skipped++; continue; }
        const t = now();
        const personId = `${signup.email.split("@")[0].replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${uid().slice(0, 4)}`;
        const person: Person = { id: personId, email: signup.email, name: "", slug: "", status: "invited", waitlistZip: signup.zip, waitlistCategory: signup.category, invitedAt: t, updatedAt: t, sample: true };
        const token = `${personId}-${uid()}`;
        state.people.push(person);
        state.invites.push({ token, personId, email: signup.email, createdAt: t, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() });
        queue(state, "invite", signup.email, { inviteUrl: absoluteUrl(`/join/?invite=${token}`), email: signup.email });
        log(state, "invited", { personId, email: signup.email }, by);
        invited++;
      }
      save(state);
      return { invited, skipped };
    },
  },

  demo: {
    async reset() {
      memory = null;
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      save(fresh(), true);
    },
    async signInAs(role: Role | "invited", personId?: string) {
      const state = load();
      if (role === "owner") { state.session = ownerSession(); save(state, true); return {}; }
      if (role === "invited") {
        state.session = null;
        const invite = state.invites.find((i) => i.token === DEMO_TOKENS.valid) as Invite;
        // Re-arm the demo invite so "invited Gigster" always works, even after a run-through.
        const person = state.people.find((p) => p.id === invite.personId)!;
        if (invite.usedAt) {
          invite.usedAt = undefined;
          Object.assign(person, { name: "", slug: "", status: "invited", registeredAt: undefined, submittedAt: undefined, approvedAt: undefined, reviewNotes: undefined });
          state.drafts = state.drafts.filter((d) => d.personId !== person.id);
          state.profiles = state.profiles.filter((p) => p.personId !== person.id);
        }
        // The invite email this person would have received.
        if (!state.outbox.some((e) => e.template === "invite" && e.to === person.email)) {
          queue(state, "invite", person.email, { inviteUrl: absoluteUrl(`/join/?invite=${invite.token}`), email: person.email });
        }
        save(state, true);
        return { inviteToken: invite.token };
      }
      const person = state.people.find((p) => p.id === personId) ?? state.people.find((p) => p.status === "draft")!;
      state.session = sessionFor(person);
      save(state, true);
      return {};
    },
    async peekCode(email) {
      return load().challenges.find((c) => c.email === email.trim().toLowerCase())?.code ?? null;
    },
    async expireCode(email) {
      const state = load();
      const c = state.challenges.find((x) => x.email === email.trim().toLowerCase());
      if (c) { c.expiresAt = new Date(Date.now() - 1000).toISOString(); save(state); }
    },
    async tokens() {
      return { ...DEMO_TOKENS };
    },
  },
};

