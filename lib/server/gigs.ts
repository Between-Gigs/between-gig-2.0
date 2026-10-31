/*
 * The DataSource methods on Company OS, server side: what each one reads and writes, and how Company OS's records
 * become 2.0's types. Method-by-method mapping and the agreed differences: Company OS
 * docs/customers/between-gigs/gap-analysis.md §13. Every call runs with the credential the route gives it; access is
 * Company OS's to decide (row policies, Super Admin routes), never this file's.
 */
import { craftOf } from "@/lib/profile/department";
import { completeness } from "@/lib/profile/validate";
import { fromProfile, toProfile, type ProfileItem } from "@/lib/data/companyos/fields";
import { personStatuses, inviteStatuses } from "@/lib/data/types";
import type {
  ActivityEvent, ActivityKind, DashboardSummary, FunnelCounts, InviteStatus, PeopleQuery, Person, PersonStatus, PersonSummary, Profile,
  ProfileDraft, ProfileFields, ProfileSection, ReviewNote, ReviewNoteInput, Session, SketchKind, SyncExternalResult, WaitlistQuery,
  WaitlistResult, WaitlistRow, WaitlistSignup,
} from "@/lib/data/types";
import { blankFields } from "@/lib/data/seed";
import { CompanyOsError, and, eq, type AdminUser, type BatchOp, type CompanyOs, type Credential, type Row } from "./companyos";

export interface Ctx {
  cos: CompanyOs;
  /** The signed-in person's credential (session routes), else the route's service identity. */
  cred: Credential;
  /** The site's address, for invitation links (APP_URL). */
  appUrl: string;
}

const SECTIONS: ProfileSection[] = ["about", "skills", "where", "story"];
const PROFILE_STATUSES = new Set(["draft", "submitted", "changes_requested", "approved"]);
const SENT = new Set(["submitted", "changes_requested", "approved"]);
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const nowIso = () => new Date().toISOString();
const iso = (v: unknown) => (typeof v === "string" ? new Date(v).toISOString() : v instanceof Date ? v.toISOString() : "");
export const mediaUrl = (fileId: string) => `/media/${fileId}`;
const groupBy = <T,>(rows: T[], key: (r: T) => string) => {
  const m = new Map<string, T[]>();
  for (const r of rows) { const k = key(r); m.set(k, [...(m.get(k) ?? []), r]); }
  return m;
};
const latest = (rows: Row[] | undefined) => rows?.slice().sort((a, b) => iso(b.createdAt).localeCompare(iso(a.createdAt)))[0];

/** Everything about a set of people that the owner screens show, read in a few queries. */
interface World {
  persons: Row[];
  profileByPerson: Map<string, Row>;
  itemsByProfile: Map<string, Row[]>;
  photoByProfile: Map<string, Row>;
  reviewsByProfile: Map<string, Row[]>;
  submissionByPerson: Map<string, Row>;
  users: Map<string, AdminUser>;
}

async function loadWorld(ctx: Ctx, persons: Row[], { owner }: { owner: boolean }): Promise<World> {
  const { cos, cred } = ctx;
  const ids = persons.map((p) => p.id);
  const profiles = ids.length ? await cos.byIds(cred, "profile", "person", ids) : [];
  const profileIds = profiles.map((p) => p.id);
  const [items, files, reviews, submissions, users] = await Promise.all([
    profileIds.length ? cos.byIds(cred, "profile_item", "profile", profileIds) : [],
    profileIds.length ? cos.byIds(cred, "file", "owner_id", profileIds, and(eq("kind", "photo"), eq("status", "ready"))) : [],
    profileIds.length ? cos.byIds(cred, "profile_review", "profile", profileIds) : [],
    owner && ids.length ? cos.byIds(cred, "form_submission", "person", ids, eq("form_key", "call_sheet")) : [],
    owner ? cos.adminUsers(cred) : [],
  ]);
  return {
    persons,
    profileByPerson: new Map(profiles.map((p) => [str(p.data.person), p])),
    itemsByProfile: groupBy(items, (i) => str(i.data.profile)),
    photoByProfile: new Map(files.map((f) => [str(f.data.owner_id), f])),
    reviewsByProfile: groupBy(reviews, (r) => str(r.data.profile)),
    submissionByPerson: new Map(submissions.map((s) => [str(s.data.person), s])),
    users: new Map(users.map((u) => [u.userId, u])),
  };
}

const itemsOf = (rows: Row[] | undefined): ProfileItem[] =>
  (rows ?? []).map((r) => ({ kind: r.data.kind as ProfileItem["kind"], value: str(r.data.value), position: Number(r.data.position ?? 0), ...(r.data.visible === false ? { visible: false } : {}) }));

function fieldsOf(w: World, profile: Row): ProfileFields {
  const photo = w.photoByProfile.get(profile.id);
  return fromProfile(profile.data, itemsOf(w.itemsByProfile.get(profile.id)), photo ? mediaUrl(photo.id) : "");
}

/** 2.0's status: the profile's, else whether the invited person's login has signed in (gap analysis §13.5). */
function statusOf(profile: Row | undefined, signedUp: boolean): PersonStatus {
  const s = str(profile?.data.status);
  if (PROFILE_STATUSES.has(s)) return s as PersonStatus;
  // rejected and hidden (Company OS's extra review states) aren't used by 2.0; they read as a draft to edit.
  if (profile) return "draft";
  return signedUp ? "registered" : "invited";
}

function notesOf(w: World, profile: Row): ReviewNote[] | undefined {
  const review = latest((w.reviewsByProfile.get(profile.id) ?? []).filter((r) => r.data.to_status === "changes_requested"));
  const sections = review?.data.section_notes;
  if (!review || !sections || typeof sections !== "object") return undefined;
  const by = w.users.get(str(review.data.reviewer))?.name || "Between Gigs";
  const at = iso(review.data.created_at) || iso(review.createdAt);
  return SECTIONS.filter((s) => str((sections as Record<string, unknown>)[s]).trim()).map((section) => ({ section, note: str((sections as Record<string, unknown>)[section]), by, at }));
}

function personOf(w: World, row: Row, signedUpSelf = false): Person {
  const profile = w.profileByPerson.get(row.id);
  const login = str(row.data.user);
  const user = w.users.get(login);
  const status = statusOf(profile, signedUpSelf || !!user?.signedUp);
  const email = str(row.data.email);
  const sub = w.submissionByPerson.get(row.id);
  const answers = (sub?.data.answers ?? {}) as Record<string, unknown>;
  // An invited person's name is their address until they name themselves (Company OS needs a name).
  const rawName = str(profile?.data.display_name) || str(row.data.name);
  const updated = [iso(row.updatedAt), iso(profile?.updatedAt)].sort().pop() ?? "";
  return {
    id: row.id,
    email,
    name: rawName === email ? "" : rawName,
    slug: str(profile?.data.public_handle),
    status,
    waitlistZip: str(answers.zip),
    waitlistCategory: str(answers.category),
    invitedAt: iso(row.createdAt),
    ...(profile?.data.submitted_at ? { submittedAt: iso(profile.data.submitted_at) } : {}),
    ...(status === "approved" && profile?.data.reviewed_at ? { approvedAt: iso(profile.data.reviewed_at) } : {}),
    updatedAt: updated,
    ...(status === "changes_requested" && profile ? { reviewNotes: notesOf(w, profile) } : {}),
  };
}

function summaryOf(w: World, row: Row, signedUpSelf = false): PersonSummary {
  const profile = w.profileByPerson.get(row.id);
  const fields = profile ? fieldsOf(w, profile) : null;
  return { person: personOf(w, row, signedUpSelf), fields, fromDraft: !!profile && !profile.data.submitted_at, completeness: completeness(fields) };
}

/** The same filters as the sample's people.list (lib/data/sample.ts). */
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
    if (!text.split(/\s+/).every((word) => hay.includes(word))) return false;
  }
  return true;
}

function sortPeople(rows: PersonSummary[], sort: PeopleQuery["sort"] = "updated") {
  const rank = (s: PersonStatus) => personStatuses.indexOf(s);
  return rows.sort((a, b) =>
    sort === "name" ? (a.person.name || a.person.email).localeCompare(b.person.name || b.person.email)
    : sort === "status" ? rank(b.person.status) - rank(a.person.status) || b.person.updatedAt.localeCompare(a.person.updatedAt)
    : b.person.updatedAt.localeCompare(a.person.updatedAt));
}

/** The people the owners manage: everyone linked to a call-sheet sign-up, with a profile, or with a Gigster login. */
async function everyone(ctx: Ctx) {
  const persons = await ctx.cos.all(ctx.cred, { entity: "person" });
  const w = await loadWorld(ctx, persons, { owner: true });
  const providers = new Set([...w.users.values()].filter((u) => u.memberships?.some((m) => m.roleKey === "provider")).map((u) => u.userId));
  const linked = new Set((await ctx.cos.all(ctx.cred, { entity: "form_submission", filter: eq("form_key", "call_sheet") })).map((s) => str(s.data.person)).filter(Boolean));
  const people = persons.filter((p) => w.profileByPerson.has(p.id) || linked.has(p.id) || providers.has(str(p.data.user)));
  return { w, people };
}

/* ---------------------------------------------------------------- sessions ---------------------------------------------------------------- */

/** The signed-in person: Super Admins are owners (N-04); anyone else is a Gigster with their linked person. */
export async function session(ctx: Ctx): Promise<Session | null> {
  let me;
  try { me = await ctx.cos.me(ctx.cred); } catch (e) {
    if (e instanceof CompanyOsError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
  const startedAt = nowIso();
  if (me.isSuperAdmin) return { personId: null, email: me.user.email, role: "owner", name: me.user.name || me.user.email, startedAt, via: "clerk" };
  const [person] = await ctx.cos.query(ctx.cred, { entity: "person", filter: eq("user", { $me: true }), limit: 1 });
  const [profile] = person ? await ctx.cos.query(ctx.cred, { entity: "profile", filter: eq("person", person.id), limit: 1 }) : [];
  const name = str(profile?.data.display_name) || str(person?.data.name);
  return { personId: person?.id ?? null, email: me.user.email, role: "gigster", name: name === me.user.email ? "" : name, startedAt, via: "clerk" };
}

/** After Clerk signs someone in. Invite-only (N-05): an account Company OS doesn't know is "unknown-email". */
export async function syncExternal(ctx: Ctx): Promise<SyncExternalResult> {
  try {
    await ctx.cos.me(ctx.cred);
  } catch (e) {
    if (e instanceof CompanyOsError && (e.status === 401 || e.status === 403)) return { ok: false, error: "unknown-email" };
    throw e;
  }
  const s = await session(ctx);
  return s ? { ok: true, session: s, created: false } : { ok: false, error: "unknown-email" };
}

/** Owner routes: a Super Admin, or Company OS's own refusal for that route (403 super-admin only). */
export async function requireOwner(ctx: Ctx) {
  const me = await ctx.cos.me(ctx.cred);
  if (!me.isSuperAdmin) throw new CompanyOsError(403, "super-admin only");
  return me;
}

/* ----------------------------------------------------------------- people ----------------------------------------------------------------- */

export async function listPeople(ctx: Ctx, query: PeopleQuery = {}) {
  await requireOwner(ctx);
  const { w, people } = await everyone(ctx);
  return sortPeople(people.map((p) => summaryOf(w, p)).filter((s) => matches(s, query)), query.sort);
}

/** One person: an owner sees anyone; a Gigster only themself (Company OS's row policy hides everyone else). */
export async function getPerson(ctx: Ctx, id: string): Promise<PersonSummary | null> {
  const me = await ctx.cos.me(ctx.cred);
  const rows = await ctx.cos.query(ctx.cred, { entity: "person", filter: eq("id", id), limit: 1 });
  if (!rows[0]) return null;
  const w = await loadWorld(ctx, rows, { owner: me.isSuperAdmin });
  return summaryOf(w, rows[0], !me.isSuperAdmin);
}

/** What the public page reads, with public_reader: only approved profiles resolve (its row policy), never contact details. */
async function publicProfiles(ctx: Ctx, profiles: Row[]) {
  const ids = profiles.map((p) => p.id);
  const [items, files] = ids.length
    ? await Promise.all([ctx.cos.byIds(ctx.cred, "profile_item", "profile", ids), ctx.cos.byIds(ctx.cred, "file", "owner_id", ids, eq("kind", "photo"))])
    : [[], []];
  const itemsBy = groupBy(items, (i) => str(i.data.profile));
  const photoBy = new Map(files.map((f) => [str(f.data.owner_id), f]));
  return profiles.map((p) => {
    const photo = photoBy.get(p.id);
    const fields = fromProfile(p.data, itemsOf(itemsBy.get(p.id)), photo ? mediaUrl(photo.id) : "");
    // The public page knows the profile, not the person: its id stands in, and nothing private is in it.
    const person: Person = {
      id: p.id, email: "", name: fields.name, slug: str(p.data.public_handle), status: "approved", waitlistZip: "", waitlistCategory: "",
      invitedAt: "", updatedAt: iso(p.updatedAt),
    };
    const profile: Profile = { personId: p.id, fields, submittedAt: "" };
    return { person, profile };
  });
}

export async function getPublic(ctx: Ctx, slug: string) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return { person: null, profile: null };
  const rows = await ctx.cos.query(ctx.cred, { entity: "profile", filter: eq("public_handle", slug), limit: 1 });
  return rows[0] ? (await publicProfiles(ctx, rows))[0]! : { person: null, profile: null };
}

/** Other approved profiles, those with a photo first. `id` is the public page's id (the profile's). */
export async function similar(ctx: Ctx, id: string, limit = 3) {
  const rows = await ctx.cos.query(ctx.cred, { entity: "profile", limit: 50, sort: [{ field: "display_name" }] });
  const out = await publicProfiles(ctx, rows.filter((r) => r.id !== id));
  return out.sort((a, b) => Number(!!b.profile.fields.photo) - Number(!!a.profile.fields.photo)).slice(0, Math.max(0, Math.min(limit, 12)));
}

/* ---------------------------------------------------------------- profiles ---------------------------------------------------------------- */

async function ownProfile(ctx: Ctx, personId: string) {
  const [profile] = await ctx.cos.query(ctx.cred, { entity: "profile", filter: eq("person", personId), limit: 1 });
  if (!profile) return { profile: undefined, items: [] as Row[], photo: undefined as Row | undefined };
  const [items, files] = await Promise.all([
    ctx.cos.all(ctx.cred, { entity: "profile_item", filter: eq("profile", profile.id) }),
    ctx.cos.query(ctx.cred, { entity: "file", filter: and(eq("owner_id", profile.id), eq("kind", "photo"), eq("status", "ready")), limit: 1 }),
  ]);
  return { profile, items, photo: files[0] };
}

const fieldsFrom = (p: { profile?: Row; items: Row[]; photo?: Row }) => fromProfile(p.profile!.data, itemsOf(p.items), p.photo ? mediaUrl(p.photo.id) : "");

/** The draft is the profile itself (N-09: one record). The builder's step stays in the browser (lib/data/api.ts). */
export async function getDraft(ctx: Ctx, personId: string): Promise<ProfileDraft | null> {
  const own = await ownProfile(ctx, personId);
  if (own.profile) return { personId, fields: fieldsFrom(own), step: 0, savedAt: iso(own.profile.updatedAt) };
  const [person] = await ctx.cos.query(ctx.cred, { entity: "person", filter: eq("id", personId), limit: 1 });
  if (!person) return null;
  const name = str(person.data.name);
  return { personId, fields: blankFields(name === str(person.data.email) ? "" : name), step: 0, savedAt: "" };
}

const keyOf = (i: { kind?: unknown; value?: unknown }) => `${String(i.kind)}\u0000${String(i.value)}`;

/** The batch that turns the stored profile into these answers: changed fields only, items by difference. */
export function draftOps(personId: string, fields: ProfileFields, existing: { profile?: Row; items: Row[] }): BatchOp[] {
  const { data, items } = toProfile(fields);
  if (!existing.profile) {
    return [
      { op: "create", entity: "profile", data: { ...data, person: personId } },
      ...items.map((i) => ({ op: "create" as const, entity: "profile_item", data: { ...i, profile: { $ref: 0 } } })),
    ];
  }
  const id = existing.profile.id;
  const old = existing.profile.data;
  const changed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (JSON.stringify(old[k] ?? "") !== JSON.stringify(v)) changed[k] = v;
  // A cleared number or month isn't in toProfile's output: clear it.
  for (const k of ["years_experience", "availability_month"]) if (!(k in data) && old[k] != null && old[k] !== "") changed[k] = null;
  const ops: BatchOp[] = Object.keys(changed).length ? [{ op: "update", entity: "profile", id, data: changed }] : [];
  // Credits are matched by text; skills, services and areas by key. One stored item per wanted item.
  const pool = groupBy(existing.items, (r) => keyOf(r.data));
  for (const want of items) {
    const have = pool.get(keyOf(want))?.shift();
    const visible = want.visible ?? true;
    if (!have) { ops.push({ op: "create", entity: "profile_item", data: { ...want, profile: id } }); continue; }
    const patch: Record<string, unknown> = {};
    if (Number(have.data.position ?? 0) !== want.position) patch.position = want.position;
    if (want.kind === "credit" && (have.data.visible !== false) !== visible) patch.visible = visible;
    if (Object.keys(patch).length) ops.push({ op: "update", entity: "profile_item", id: have.id, data: patch });
  }
  for (const left of pool.values()) for (const r of left) ops.push({ op: "delete", entity: "profile_item", id: r.id });
  return ops;
}

export async function saveDraft(ctx: Ctx, personId: string, fields: ProfileFields): Promise<ProfileDraft> {
  const own = await ownProfile(ctx, personId);
  if (!own.profile) {
    // Only the person themself may create their profile; Company OS refuses anyone else (forbidden).
    const [person] = await ctx.cos.query(ctx.cred, { entity: "person", filter: eq("id", personId), limit: 1 });
    if (!person) throw new CompanyOsError(404, "not found");
  }
  const ops = draftOps(personId, fields, own);
  for (let i = 0; i < ops.length; i += 200) {
    // The first batch creates the profile when there is none; later chunks only touch items (rare: over 200 changes).
    await ctx.cos.batch(ctx.cred, ops.slice(i, i + 200));
  }
  // Removing the photo deletes it (Company OS refuses if that would leave a submitted profile without one).
  if (!fields.photo && own.photo) await ctx.cos.remove(ctx.cred, "file", own.photo.id);
  const after = await ownProfile(ctx, personId);
  return { personId, fields: after.profile ? fieldsFrom(after) : fields, step: 0, savedAt: after.profile ? iso(after.profile.updatedAt) : nowIso() };
}

export async function submit(ctx: Ctx, personId: string) {
  const own = await ownProfile(ctx, personId);
  if (!own.profile) throw new CompanyOsError(422, "profile_incomplete", "nothing to submit");
  await ctx.cos.patch(ctx.cred, "profile", own.profile.id, { status: "submitted" });
  const summary = await getPerson(ctx, personId);
  const profile = await getProfile(ctx, personId);
  if (!summary || !profile) throw new CompanyOsError(404, "not found");
  return { person: summary.person, profile };
}

/** The submitted profile (null before the first submit). One record with the draft since N-09. */
export async function getProfile(ctx: Ctx, personId: string): Promise<Profile | null> {
  const own = await ownProfile(ctx, personId);
  if (!own.profile?.data.submitted_at) return null;
  return { personId, fields: fieldsFrom(own), submittedAt: iso(own.profile.data.submitted_at) };
}

/** The photo step: the profile (created if needed), then the file through Company OS's upload flow. Returns its /media link. */
export async function uploadPhoto(ctx: Ctx, personId: string, bytes: Uint8Array, mime: string): Promise<string> {
  if (!PHOTO_TYPES.has(mime)) throw new CompanyOsError(422, "file_type_not_allowed");
  if (bytes.byteLength === 0 || bytes.byteLength > PHOTO_MAX_BYTES) throw new CompanyOsError(422, "file_too_large");
  let { profile } = await ownProfile(ctx, personId);
  if (!profile) {
    const [person] = await ctx.cos.query(ctx.cred, { entity: "person", filter: eq("id", personId), limit: 1 });
    if (!person) throw new CompanyOsError(404, "not found");
    const name = str(person.data.name);
    profile = await ctx.cos.create(ctx.cred, "profile", { person: personId, ...(name && name !== str(person.data.email) ? { display_name: name } : {}) });
  }
  const ext = mime.split("/")[1] === "jpeg" ? "jpg" : mime.split("/")[1];
  const { file, uploadUrl } = await ctx.cos.startUpload(ctx.cred, { ownerEntity: "profile", ownerId: profile.id, kind: "photo", filename: `photo.${ext}`, mime, sizeBytes: bytes.byteLength });
  await ctx.cos.putBytes(uploadUrl, bytes, mime);
  await ctx.cos.confirmUpload(ctx.cred, file.id);
  return mediaUrl(file.id);
}

/* ----------------------------------------------------------------- funnel ----------------------------------------------------------------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (o: Record<string, string | undefined>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v && v.trim()).map(([k, v]) => [k, v!.trim()]));

/** "Get on the call sheet". One per email (ADR 0042): a repeat merges and says "already joined". The signup's id is its email. */
export async function joinWaitlist(ctx: Ctx, input: { email: string; zip: string; category?: string; placement: string }): Promise<WaitlistResult> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: "email" };
  if (!/^\d{5}$/.test(input.zip)) return { ok: false, error: "zip" };
  let outcome: "created" | "merged";
  try {
    ({ outcome } = await ctx.cos.submitForm("call_sheet", { email, answers: clean({ zip: input.zip, category: input.category }) }));
  } catch (e) {
    if (e instanceof CompanyOsError && e.code === "invalid_email") return { ok: false, error: "email" };
    throw e;
  }
  // Where the first sign-up came from stays (a merge would overwrite it): the placement goes only with a new sign-up.
  const placement = input.placement.trim().slice(0, 60);
  if (outcome === "created" && placement) await ctx.cos.submitForm("call_sheet", { email, placement });
  const signup: WaitlistSignup = { id: email, email, zip: input.zip, category: input.category ?? "", details: "", placement: input.placement, createdAt: nowIso() };
  return { ok: true, signup, alreadyJoined: outcome === "merged" };
}

export async function addDetails(ctx: Ctx, signupId: string, input: { category: string; details: string }): Promise<WaitlistSignup> {
  const email = signupId.trim().toLowerCase();
  if (!EMAIL.test(email)) throw new CompanyOsError(422, "invalid_email");
  await ctx.cos.submitForm("call_sheet", { email, answers: clean({ category: input.category, details: input.details.slice(0, 2000) }) });
  return { id: email, email, zip: "", category: input.category, details: input.details.trim(), placement: "", createdAt: nowIso() };
}

const SKETCH_ANSWERS: Record<SketchKind, string[]> = {
  talent: ["name", "role", "services", "location", "availability", "rate", "details", "service"],
  buyer: ["name", "project", "location", "timing", "team_size", "budget", "details", "service"],
};

export async function submitSketch(ctx: Ctx, kind: SketchKind, answers: Record<string, string>) {
  if (kind !== "talent" && kind !== "buyer") throw new CompanyOsError(422, "unknown_form");
  const email = str(answers.email).trim().toLowerCase();
  if (!EMAIL.test(email)) throw new CompanyOsError(422, "invalid_email");
  const kept = clean(Object.fromEntries(SKETCH_ANSWERS[kind].map((k) => [k, str(answers[k]).slice(0, 2000)])));
  await ctx.cos.submitForm(`storyboard_${kind}`, { email, answers: kept });
  const { name = "", ...rest } = kept;
  return { id: "", kind, name, email, answers: rest, createdAt: nowIso() };
}

export async function privacyRequest(ctx: Ctx, emailIn: string, message: string) {
  const email = emailIn.trim().toLowerCase();
  if (!EMAIL.test(email)) throw new CompanyOsError(422, "invalid_email");
  await ctx.cos.submitForm("privacy_request", { email, answers: clean({ message: message.slice(0, 2000) }) });
  return { id: "", email, message: message.trim(), createdAt: nowIso() };
}

/* ----------------------------------------------------------------- owners ----------------------------------------------------------------- */

const countBy = <K extends string>(keys: readonly K[], values: K[]) =>
  Object.fromEntries(keys.map((k) => [k, values.filter((v) => v === k).length])) as Record<K, number>;

async function waitlistRows(ctx: Ctx, w?: World) {
  const subs = await ctx.cos.all(ctx.cred, { entity: "form_submission", filter: eq("form_key", "call_sheet") });
  const persons = w?.persons ?? await ctx.cos.byIds(ctx.cred, "person", "id", [...new Set(subs.map((s) => str(s.data.person)).filter(Boolean))]);
  const users = w?.users ?? new Map((await ctx.cos.adminUsers(ctx.cred)).map((u) => [u.userId, u]));
  const personById = new Map(persons.map((p) => [p.id, p]));
  return subs.map((s): WaitlistRow => {
    const answers = (s.data.answers ?? {}) as Record<string, unknown>;
    const person = personById.get(str(s.data.person));
    // No "opened" stage: Clerk doesn't report an opened invite (N-10, gap analysis §13.3 #6).
    const inviteStatus: InviteStatus = !person ? "not_invited" : users.get(str(person.data.user))?.signedUp ? "registered" : "invited";
    return {
      signup: {
        id: s.id, email: str(s.data.email), zip: str(answers.zip), category: str(answers.category), details: str(answers.details),
        placement: str(s.data.placement), createdAt: iso(s.data.submitted_at) || iso(s.createdAt),
      },
      inviteStatus,
      ...(person ? { personId: person.id, invitedAt: iso(person.createdAt) } : {}),
    };
  });
}

export async function waitlist(ctx: Ctx, query: WaitlistQuery = {}) {
  await requireOwner(ctx);
  const text = query.text?.trim().toLowerCase();
  const rows = (await waitlistRows(ctx)).filter((r) =>
    (!query.inviteStatus || query.inviteStatus === "all" || r.inviteStatus === query.inviteStatus)
    && (!query.category || query.category === "all" || r.signup.category === query.category)
    && (!text || `${r.signup.email} ${r.signup.zip} ${r.signup.details}`.toLowerCase().includes(text)));
  const sort = query.sort ?? "joined-new";
  return rows.sort((a, b) => sort === "email" ? a.signup.email.localeCompare(b.signup.email)
    : sort === "zip" ? a.signup.zip.localeCompare(b.signup.zip) || a.signup.email.localeCompare(b.signup.email)
    : sort === "joined-old" ? a.signup.createdAt.localeCompare(b.signup.createdAt)
    : b.signup.createdAt.localeCompare(a.signup.createdAt));
}

/** Each sign-up in turn (R-14): a person from the submission, the link, the invitation, the invite email sent by hand. */
export async function invite(ctx: Ctx, signupIds: string[]) {
  await requireOwner(ctx);
  let invited = 0, skipped = 0;
  for (const id of [...new Set(signupIds)].slice(0, 200)) {
    const [sub] = /^[0-9a-f-]{36}$/i.test(id) ? await ctx.cos.query(ctx.cred, { entity: "form_submission", filter: and(eq("id", id), eq("form_key", "call_sheet")), limit: 1 }) : [];
    if (!sub || sub.data.person) { skipped++; continue; }
    const email = str(sub.data.email);
    // An address with a person already (another sign-up, an earlier import) reuses it.
    const [existing] = await ctx.cos.query(ctx.cred, { entity: "person", filter: eq("email", email), limit: 1 });
    const personId = existing?.id ?? (await ctx.cos.create(ctx.cred, "person", { name: email, email })).id;
    await ctx.cos.patch(ctx.cred, "form_submission", sub.id, { person: personId });
    let url: string;
    try {
      ({ url } = await ctx.cos.invite(ctx.cred, { email, roleKey: "provider", personId, redirectUrl: `${ctx.appUrl}/join/` }));
    } catch (e) {
      if (e instanceof CompanyOsError && e.code === "already_signed_up") { skipped++; continue; }
      throw e;
    }
    await ctx.cos.create(ctx.cred, "comms_log", { deliver: true, channel: "email", recipient: personId, message_key: "invite", vars: { invite_url: url } });
    invited++;
  }
  return { invited, skipped };
}

async function profileOf(ctx: Ctx, personId: string) {
  const [profile] = await ctx.cos.query(ctx.cred, { entity: "profile", filter: eq("person", personId), limit: 1 });
  if (!profile) throw new CompanyOsError(422, "invalid_status_transition", "no profile");
  return profile;
}

/** One batch: the review first (with its readable note and the per-section notes), then the status (N-10, R-11). */
async function decide(ctx: Ctx, personId: string, status: "approved" | "changes_requested", notes: ReviewNoteInput[]) {
  await requireOwner(ctx);
  const profile = await profileOf(ctx, personId);
  // Only a submitted profile is decided on. Company OS would take a review of an approved profile as a note.
  if (profile.data.status !== "submitted") throw new CompanyOsError(422, "invalid_status_transition", "only a submitted profile can be reviewed");
  const sections = Object.fromEntries(notes.map((n) => [n.section, n.note]));
  const label: Record<ProfileSection, string> = { about: "About you", skills: "Skills & services", where: "Where & when", story: "Your story" };
  const note = notes.length ? notes.map((n) => `${label[n.section]}: ${n.note}`).join("\n") : "Approved";
  await ctx.cos.batch(ctx.cred, [
    { op: "create", entity: "profile_review", data: { profile: profile.id, note, section_notes: sections } },
    { op: "update", entity: "profile", id: profile.id, data: { status } },
  ]);
  const summary = await getPerson(ctx, personId);
  if (!summary) throw new CompanyOsError(404, "not found");
  return summary.person;
}

export const approve = (ctx: Ctx, personId: string) => decide(ctx, personId, "approved", []);

export function requestChanges(ctx: Ctx, personId: string, notes: ReviewNoteInput[]) {
  const kept = (Array.isArray(notes) ? notes : [])
    .filter((n) => SECTIONS.includes(n?.section) && typeof n.note === "string")
    .map((n) => ({ section: n.section, note: n.note.trim().slice(0, 600) }))
    .filter((n) => n.note);
  if (!kept.length) throw new CompanyOsError(422, "review_note_required");
  return decide(ctx, personId, "changes_requested", kept);
}

export async function reviewQueue(ctx: Ctx) {
  await requireOwner(ctx);
  const profiles = await ctx.cos.all(ctx.cred, { entity: "profile", filter: eq("status", "submitted"), sort: [{ field: "submitted_at", dir: "asc" }] });
  const persons = await ctx.cos.byIds(ctx.cred, "person", "id", profiles.map((p) => str(p.data.person)));
  const w = await loadWorld(ctx, persons, { owner: true });
  return persons.map((p) => summaryOf(w, p)).sort((a, b) => (a.person.submittedAt ?? "").localeCompare(b.person.submittedAt ?? ""));
}

/** Recent activity from the audit trail (Super Admin): the events 2.0 shows, with names from the records. */
async function activityFrom(ctx: Ctx, limit: number, w?: World): Promise<ActivityEvent[]> {
  const events = await ctx.cos.audit(ctx.cred, { limit: String(Math.min(500, Math.max(limit * 4, 50))) });
  const world = w ?? (await everyone(ctx)).w;
  const personByProfile = new Map([...world.profileByPerson.entries()].map(([personId, p]) => [p.id, personId]));
  const personByUser = new Map(world.persons.filter((p) => p.data.user).map((p) => [str(p.data.user), p.id]));
  const personRow = new Map(world.persons.map((p) => [p.id, p]));
  const who = (personId?: string, email?: string) => {
    const p = personId ? personRow.get(personId) : undefined;
    const name = str(world.profileByPerson.get(personId ?? "")?.data.display_name) || str(p?.data.name);
    return name && name !== str(p?.data.email) ? name : str(p?.data.email) || email || "Someone";
  };
  const out: ActivityEvent[] = [];
  for (const e of events) {
    const d = e.details ?? {};
    let kind: ActivityKind | null = null;
    let personId: string | undefined;
    if (e.event === "form.submitted" && d.form_key === "call_sheet" && d.outcome === "created") kind = "joined_waitlist";
    else if (e.event === "user.invited") { kind = "invited"; personId = str(d.personId) || undefined; }
    else if (e.event === "auth.linked") { kind = "registered"; personId = personByUser.get(str(d.userId)); }
    else if (e.event === "profile.submitted") { kind = "submitted"; personId = personByProfile.get(str(d.profile)); }
    else if (e.event === "profile.reviewed" && (d.to === "approved" || d.to === "changes_requested")) { kind = d.to; personId = personByProfile.get(str(d.profile)); }
    if (!kind) continue;
    const by = kind === "approved" || kind === "changes_requested" || kind === "invited" ? world.users.get(str(e.actor))?.name || "Between Gigs" : undefined;
    out.push({ id: e.id, kind, ...(personId ? { personId } : {}), who: who(personId, str(d.email)), ...(by ? { by } : {}), at: iso(e.at) });
    if (out.length >= limit) break;
  }
  return out;
}

export async function activity(ctx: Ctx, limit = 50) {
  await requireOwner(ctx);
  return activityFrom(ctx, Math.min(Math.max(1, limit), 200));
}

export async function dashboard(ctx: Ctx): Promise<DashboardSummary> {
  await requireOwner(ctx);
  const { w, people } = await everyone(ctx);
  const summaries = people.map((p) => summaryOf(w, p));
  const rows = await waitlistRows(ctx, w);
  const counts = countBy(personStatuses, summaries.map((s) => s.person.status));
  const waitlist = { ...countBy(inviteStatuses, rows.map((r) => r.inviteStatus)), total: rows.length };
  const cohortIds = new Set(rows.map((r) => r.personId).filter((x): x is string => !!x));
  const cohort = summaries.filter((s) => cohortIds.has(s.person.id));
  const invitedCounts = countBy(personStatuses, cohort.map((s) => s.person.status));
  const accounts = cohort.filter((s) => s.person.status !== "invited").length;
  const funnel: FunnelCounts = {
    signups: rows.length,
    invited: cohort.length,
    opened: accounts, // no "opened" stage live (N-10)
    accounts,
    submitted: cohort.filter((s) => SENT.has(s.person.status) || !!s.person.submittedAt).length,
    approved: invitedCounts.approved,
  };
  const reviewQueue = summaries.filter((s) => s.person.status === "submitted").sort((a, b) => (a.person.submittedAt ?? "").localeCompare(b.person.submittedAt ?? ""));
  return { counts, invitedCounts, invitedPersonIds: cohort.map((s) => s.person.id), funnel, waitlist, reviewQueue, activity: await activityFrom(ctx, 12, w) };
}
