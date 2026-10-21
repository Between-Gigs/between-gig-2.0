/*
 * The sample DataSource: the whole backend, faked in the browser. State lives in localStorage under
 * one key, seeded from ./seed.ts, and survives reloads until the demo switcher resets it.
 * Nothing leaves the browser: "sent" emails land in a local outbox you can open at /emails.
 */
import { renderEmail } from "@/emails";
import { completeness, validateAll } from "@/lib/profile/validate";
import { absoluteUrl } from "@/lib/site";
import { blankFields, buildSeed, DEMO_TOKENS, SAMPLE_OWNER, type SeedState } from "./seed";
import type { DataSource } from "./source";
import type {
  EmailTemplate, Invite, InviteLookup, OutboxEmail, PeopleQuery, Person, PersonStatus, PersonSummary, Profile,
  PrivacyRequest, ProfileDraft, Role, Session, SketchSubmission, WaitlistSignup,
} from "./types";
import { personStatuses } from "./types";

const KEY = "bg2-sample-v1";
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
  session: Session | null;
  challenges: Challenge[];
}

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
/** A short pause so loading states are real, as they will be over the network. */
const latency = (ms = 60) => new Promise((r) => setTimeout(r, ms));

function fresh(): State {
  return { ...buildSeed(), outbox: [], session: null, challenges: [] };
}

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
      return lookupInvite(load(), token);
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

