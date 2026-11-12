/*
 * The sample DataSource: the whole backend, faked in the browser. State lives in localStorage under
 * one key, seeded from ./seed.ts, and survives reloads until it is reset (QA, or clearing site data).
 * Nothing leaves the browser: "sent" emails land in a local outbox you can open at /emails.
 */
import { renderEmail } from "@/emails";
import { featuredPeople } from "./featured-people";
import { craftOf } from "@/lib/profile/department";
import { LIVE_FIELDS, NAME_MAX, completeness, contentChanged, pinnedCredits, validateAll } from "@/lib/profile/validate";
import { absoluteUrl } from "@/lib/site";
import { blankFields, buildActivity, buildSeed, buildWaitlist, DEMO_TOKENS, SAMPLE_OWNER, seedPeople, type SeedState } from "./seed";
import type { DataSource } from "./source";
import type {
  EmailTemplate, Invite, InviteLookup, OutboxEmail, PeopleQuery, Person, PersonStatus, PersonSummary, Profile,
  PrivacyRequest, ProfileDraft, ProfileFields, Role, Session, SketchSubmission, WaitlistSignup,
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
  const seed = buildSeed([...seedPeople, ...featuredPeople]);
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

/*
 * Studio's Live site previews a page as someone else in a frame named "bg-preview:<who>" (owner, visitor, invited, or
 * gigster:<personId>). That frame gets its own session, never stored, so the browser's own sign-in stays as it was.
 */
const preview = (() => {
  try { return typeof window !== "undefined" && window.name.startsWith("bg-preview:") ? window.name.slice("bg-preview:".length) : null; } catch { return null; }
})();
function previewSession(state: State): Session | null {
  if (preview === "owner") return ownerSession();
  const id = preview?.startsWith("gigster:") ? preview.slice("gigster:".length) : null;
  const person = id ? state.people.find((p) => p.id === id) : undefined;
  return person ? sessionFor(person) : null;
}

/** Older browser samples get the new examples without a reset. Never overwrite a draft, session, invite or public handle. */
function addFeaturedExamples(state: State) {
  // Some demonstration browsers already have the four examples from before the extra questions.
  // Fill only absent properties, so an explicitly cleared answer stays cleared.
  for (const record of [...state.drafts, ...state.profiles]) {
    const defaults = featuredPeople.find((p) => p.id === record.personId)?.fields;
    if (!defaults) continue;
    for (const key of ["bookingMobile", "earliestStart", "bookingMinimum", "personality", "hireableJobs"] as const) {
      if (record.fields[key] === undefined) record.fields[key] = defaults[key];
    }
  }
  const missing = featuredPeople.filter((sample) => !state.people.some((p) => p.id === sample.id));
  if (!missing.length) return state;
  const additions = buildSeed(missing);
  for (const person of additions.people) {
    person.slug = uniqueSlug(state, person.slug, person.id);
    // A visitor may already have registered with the example's ordinary name or address.
    const stem = person.email.split("@")[0];
    for (let n = 1; state.people.some((p) => p.email === person.email) || state.waitlist?.some((w) => w.email === person.email); n++) {
      person.email = `${stem}.example${n}@example.com`;
    }
    const invite = additions.invites.find((i) => i.personId === person.id)!;
    invite.email = person.email;
    state.people.push(person);
  }
  state.invites.push(...additions.invites);
  state.drafts.push(...additions.drafts);
  state.profiles.push(...additions.profiles);
  state.activity = state.activity ? [...state.activity, ...buildActivity(additions.people)].sort((a, b) => b.at.localeCompare(a.at)) : buildActivity(state.people);
  state.waitlist ??= [];
  for (const p of additions.people) state.waitlist.push({
    id: `wl-featured-${p.id}`, email: p.email, zip: p.waitlistZip, category: p.waitlistCategory, details: "",
    placement: "profiles", createdAt: p.invitedAt,
  });
  return state;
}

function load(): State {
  if (memory) return memory;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    memory = raw ? addFeaturedExamples(JSON.parse(raw) as State) : fresh();
  } catch {
    memory = fresh();
  }
  if (preview) memory.session = previewSession(memory);
  return memory;
}

function save(state: State, sessionChanged = false) {
  memory = state;
  let stored: State = state;
  // A preview frame writes the data it changes, but keeps the browser's own session in storage.
  if (preview) {
    try { stored = { ...state, session: (JSON.parse(localStorage.getItem(KEY) ?? "null") as State | null)?.session ?? null }; } catch { /* keep state */ }
  }
  try { localStorage.setItem(KEY, JSON.stringify(stored)); } catch { /* storage full or blocked: keep the in-memory copy */ }
  if (sessionChanged && typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE));
}

/** Other tabs change the store too; drop the cached copy when they do. */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) { memory = null; window.dispatchEvent(new Event(CHANGE)); }
  });
}

/** Live public handles are at most 60 characters (lib/server/gigs.ts getPublic); the sample's slugs keep to that too. */
const SLUG_MAX = 60;
const trimSlug = (s: string, max: number) => s.slice(0, max).replace(/-+$/, "");
export const slugify = (name: string) =>
  trimSlug(name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), SLUG_MAX) || "gigster";

function uniqueSlug(state: State, name: string, selfId: string) {
  const base = slugify(name);
  let slug = base;
  // A number on the end still fits in 60 characters: the base gives way.
  for (let n = 2; state.people.some((p) => p.slug === slug && p.id !== selfId); n++) slug = `${trimSlug(base, SLUG_MAX - String(n).length - 1)}-${n}`;
  return slug;
}

/** A name as stored: single spaces, at most 60 characters (the page lays out up to that, and it makes the link). */
export const cleanName = (name: string) => name.trim().replace(/\s+/g, " ").slice(0, NAME_MAX).trim();

/** Availability from `from` onto `to`: the part of a profile that changes without a review. */
const withAvailability = (to: ProfileFields, from: ProfileFields): ProfileFields => ({ ...to, ...Object.fromEntries(LIVE_FIELDS.map((k) => [k, from[k]])) });

/**
 * What a visitor's page may know, as live's public_reader reads it: the profile, not the person. No email, ZIP,
 * waitlist answers, review notes or dates of the review; no IMDb link, private "something else", home ZIP or city, and
 * hidden credits left out.
 */
function publicOf(person: Person, profile: Profile): { person: Person; profile: Profile } {
  const f = { ...profile.fields };
  delete f.bookingMobile;
  const credits = pinnedCredits(f);
  return {
    person: { id: person.id, email: "", name: person.name, slug: person.slug, status: "approved", waitlistZip: "", waitlistCategory: "", invitedAt: "", updatedAt: person.updatedAt, ...(person.sample ? { sample: true } : {}) },
    profile: clone({ personId: profile.personId, fields: { ...f, credits, creditPins: credits.map(() => true), imdb: "", other: "", zip: "", otherCity: "" }, submittedAt: "", ...(profile.extras ? { extras: profile.extras } : {}) }),
  };
}

function summarize(state: State, person: Person): PersonSummary {
  const profile = state.profiles.find((p) => p.personId === person.id);
  const draft = state.drafts.find((d) => d.personId === person.id);
  // Owners see the submitted version while a review is pending; the draft only before first submit.
  const fields = profile?.fields ?? draft?.fields ?? null;
  const unsent = !!profile && !!draft && contentChanged(draft.fields, profile.fields);
  return { person: clone(person), fields: fields ? clone(fields) : null, fromDraft: !profile && !!draft, completeness: completeness(fields), unsent };
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

/** Re-arms the demo invite so "invited Gigster" always works, even after a run-through. Leaves the session alone. */
function rearmInvite(state: State) {
  const invite = state.invites.find((i) => i.token === DEMO_TOKENS.valid) as Invite;
  const person = state.people.find((p) => p.id === invite.personId)!;
  if (invite.usedAt) {
    invite.usedAt = undefined;
    Object.assign(person, { name: "", slug: "", status: "invited", registeredAt: undefined, submittedAt: undefined, approvedAt: undefined, reviewNotes: undefined, previousNotes: undefined, reviewRound: undefined });
    state.drafts = state.drafts.filter((d) => d.personId !== person.id);
    state.profiles = state.profiles.filter((p) => p.personId !== person.id);
  }
  // The invite email this person would have received.
  if (!state.outbox.some((e) => e.template === "invite" && e.to === person.email)) {
    queue(state, "invite", person.email, { inviteUrl: absoluteUrl(`/join/?invite=${invite.token}`), email: person.email });
  }
  return invite.token;
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
      // Like live: only an approved profile resolves, and anything else reads exactly as an unknown handle, so a
      // visitor can't tell who is on the platform. The person themself checks their own slug (PublicProfile).
      const person = state.people.find((p) => p.slug === slug && p.slug !== "" && p.status === "approved");
      const profile = person && state.profiles.find((p) => p.personId === person.id);
      return person && profile ? publicOf(person, profile) : { person: null, profile: null };
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
        .map((x) => publicOf(x.person, x.profile));
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
    async register({ token, email, name, acceptTerms }) {
      await latency(200);
      const state = load();
      const found = token ? lookupInvite(state, token) : undefined;
      if (found && found.state !== "valid") return { ok: false, error: found.state };
      const address = (email ?? found?.invite?.email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { ok: false, error: "email" };
      if (!name.trim()) return { ok: false, error: "name" };
      if (!acceptTerms) return { ok: false, error: "terms" };
      let person = state.people.find((p) => p.email.toLowerCase() === address);
      if (person && person.status !== "invited") return { ok: false, error: "existing-account" };
      const t = now();
      if (!person) {
        person = { id: uid(), email: address, name: "", slug: "", status: "invited",
          waitlistZip: "", waitlistCategory: "", invitedAt: "", updatedAt: t };
        state.people.push(person);
      }
      person.name = cleanName(name);
      person.slug = uniqueSlug(state, person.name, person.id);
      person.status = "registered";
      person.registeredAt = t;
      person.updatedAt = t;
      // An optional invite belongs to its original address, even if the form's email was edited.
      const invite = state.invites.find((i) => i.token === token && i.email.toLowerCase() === address && i.personId === person.id);
      if (invite) invite.usedAt = t;
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
      let person = state.people.find((p) => p.email.toLowerCase() === address);
      if ((!person || person.status === "invited") && identity.acceptedTerms !== true) return { ok: false, error: "terms" };
      if (!person) {
        person = { id: uid(), email: address, name: "", slug: "", status: "invited",
          waitlistZip: "", waitlistCategory: "", invitedAt: "", updatedAt: now() };
        state.people.push(person);
      }
      let created = false;
      if (person.status === "invited") {
        // Clerk has verified this email. A missing or stale optional invite never blocks the identity.
        const invite = state.invites.find((i) => i.token === identity.inviteToken && i.personId === person.id
          && i.email.toLowerCase() === address && !i.usedAt && new Date(i.expiresAt).getTime() >= Date.now());
        const t = now();
        person.name = cleanName(identity.name ?? "") || cleanName(address.split("@")[0]);
        person.slug = uniqueSlug(state, person.name, person.id);
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
      // The write lands at once and the answer comes after the pause, so a save started as the page closes still lands.
      const state = load();
      const person = state.people.find((p) => p.id === personId);
      if (!person) throw new Error("No such person");
      const draft: ProfileDraft = { personId, fields: clone(fields), step, savedAt: now() };
      state.drafts = [...state.drafts.filter((d) => d.personId !== personId), draft];
      if (person.status === "registered") person.status = "draft";
      /*
       * A draft is only ever the Gigster's working copy. Once a version has gone to the team (submitted, changes
       * requested or live), saving never changes what the team or the public sees, and never changes the status:
       * - availability (month, status, dates) is copied onto that version straight away, so it stays current, live too;
       * - every other change stays in the draft, "unsent", until submit() (the editor's "Send again").
       */
      const sent = state.profiles.find((p) => p.personId === personId);
      if (sent) sent.fields = withAvailability(sent.fields, draft.fields);
      // The profile name follows the questionnaire's "Full name" until it's submitted.
      if (fields.name.trim() && (person.status === "draft")) person.name = cleanName(fields.name);
      person.updatedAt = draft.savedAt;
      save(state);
      await latency(120);
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
      // Sending replaces the version the team has (and, for a live profile, takes it off the site until it's approved
      // again, as live does). Sent again after "Suggest edits", it's a re-review: those notes go with it.
      const was = person.status;
      const profile: Profile = { personId, fields: clone(draft.fields), submittedAt: t, extras: previous?.extras };
      state.profiles = [...state.profiles.filter((p) => p.personId !== personId), profile];
      person.name = cleanName(draft.fields.name);
      if (!person.slug) person.slug = uniqueSlug(state, person.name, person.id);
      if (was === "changes_requested") person.previousNotes = person.reviewNotes?.length ? clone(person.reviewNotes) : undefined;
      else if (was !== "submitted") person.previousNotes = undefined;
      // A new round, except "Send again" while still in review, which only replaces what the team is looking at.
      if (was !== "submitted") person.reviewRound = (person.reviewRound ?? (person.submittedAt ? 1 : 0)) + 1;
      person.status = "submitted";
      person.submittedAt = t;
      person.approvedAt = undefined;
      person.updatedAt = t;
      person.reviewNotes = undefined;
      log(state, "submitted", { personId: person.id, name: person.name, email: person.email });
      queue(state, "profile-submitted", person.email, {
        firstName: person.name.split(" ")[0] ?? "",
        profileUrl: absoluteUrl("/profile/"),
        editUrl: absoluteUrl("/profile/canvas/"),
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
    async uploadPhoto(personId, file) {
      await latency(120);
      if (!load().people.some((p) => p.id === personId)) throw new Error("No such person");
      // The sample keeps the (already cropped and resized) photo as a data URL in the fields.
      const bytes = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return `data:${file.type || "image/jpeg"};base64,${btoa(bin)}`;
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
      // Answered like a first join (N-16): nothing of the stored sign-up, and no second welcome email.
      if (existing) return { ok: true, signup: { id: existing.id, email: address, zip, category, details: "", placement, createdAt: now() } };
      const signup: WaitlistSignup = { id: uid(), email: address, zip, category, details: "", placement, createdAt: now() };
      state.waitlist.unshift(signup);
      log(state, "joined_waitlist", { email: address });
      queue(state, "welcome", address, { storyboardUrl: absoluteUrl("/storyboard/") });
      save(state);
      return { ok: true, signup: clone(signup) };
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
      // Every invitation-funnel stage uses the same waitlist + actual-invitation cohort.
      // Open signup records remain in the global counts/review queue, but cannot inflate this funnel.
      const waitlistEmails = new Set((state.waitlist ?? []).map((w) => w.email.toLowerCase()));
      const invitedIds = new Set(state.invites.map((i) => i.personId));
      const invited = state.people.filter((p) => waitlistEmails.has(p.email.toLowerCase()) && invitedIds.has(p.id));
      const invitedCounts = Object.fromEntries(personStatuses.map((st) => [st, invited.filter((p) => p.status === st).length])) as Record<PersonStatus, number>;
      const openedIds = new Set(state.invites.filter((i) => i.openedAt).map((i) => i.personId));
      const sent = ["submitted", "changes_requested", "approved"];
      const funnel = {
        signups: waitlist.total,
        invited: invited.length,
        opened: invited.filter((p) => p.status !== "invited" || openedIds.has(p.id)).length,
        accounts: invited.filter((p) => p.status !== "invited").length,
        submitted: invited.filter((p) => p.status !== "invited" && (sent.includes(p.status) || !!p.submittedAt)).length,
        approved: invitedCounts.approved,
      };
      return { counts, invitedCounts, invitedPersonIds: invited.map((p) => p.id), funnel, waitlist, reviewQueue: await sampleSource.owners.reviewQueue(), activity: clone((state.activity ?? []).slice(0, 12)) };
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
      // The approved version goes live as the team saw it, with the Gigster's latest availability. A newer draft (edited
      // while in review) is kept, and stays unsent: it isn't what the team approved.
      const profile = state.profiles.find((p) => p.personId === personId);
      const draft = state.drafts.find((d) => d.personId === personId);
      if (profile && draft) profile.fields = withAvailability(profile.fields, draft.fields);
      log(state, "approved", { personId, name: person.name, email: person.email }, ownerName(state));
      queue(state, "approved", person.email, {
        firstName: person.name.split(" ")[0] ?? "", profileUrl: absoluteUrl(`/p/${person.slug}/`), editUrl: absoluteUrl("/profile/canvas/"),
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
        editUrl: absoluteUrl("/profile/canvas/"),
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
    async publicExamples() {
      const state = load();
      return featuredPeople.flatMap(({ id }) => {
        const person = state.people.find((p) => p.id === id && p.sample && p.status === "approved");
        const profile = person && state.profiles.find((p) => p.personId === id);
        return person && profile ? [publicOf(person, profile)] : [];
      });
    },
    async rearmInvite() {
      const state = load();
      rearmInvite(state);
      save(state);
    },
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
        const inviteToken = rearmInvite(state);
        save(state, true);
        return { inviteToken };
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

