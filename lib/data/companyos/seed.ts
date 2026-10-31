/*
 * 2.0's made-up sample (lib/data/seed.ts) as a Company OS test seed: an operator-import payload with the images to
 * upload after it (Company OS ADR 0025 amendment 2026-10-30, the registry's `testSeed`). Everything in it is
 * fictional. Ids are derived from the sample's own ids, so regenerating it gives the same file.
 * Written by scripts/seed-companyos.ts into Company OS deploy/seeds/between-gigs.json.
 */
import { createHash } from "node:crypto";
import type { Person, ProfileSection, WaitlistSignup } from "../types.ts";
import type { SeedState } from "../seed.ts";
import { toProfile } from "./fields.ts";

type SeedRecord = { entity: string; id?: string; data: Record<string, unknown> };
type SeedFile = { owner_entity: "profile"; owner_id: string; kind: "photo"; path: string; mime: "image/jpeg"; source: string };
export type CompanyOsSeed = { fictional: true; _about: string; records: SeedRecord[]; files: SeedFile[] };

/** A stable UUID (version 5 layout) for one of the sample's ids. */
function uuid(name: string): string {
  const h = createHash("sha1").update(`between-gigs-2.0-seed:${name}`).digest();
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

const sectionLabel: Record<ProfileSection, string> = { about: "About you", skills: "Skills & services", where: "Where & when", story: "Your story" };

export function toCompanyOsSeed(state: SeedState, waitlist: WaitlistSignup[]): CompanyOsSeed {
  const records: SeedRecord[] = [];
  const files: SeedFile[] = [];
  const byEmail = new Map<string, Person>(state.people.map((p) => [p.email, p]));

  for (const p of state.people) {
    // Invited people haven't named themselves yet: the person's required name is their address until then.
    records.push({ entity: "person", id: uuid(`person:${p.id}`), data: { name: p.name || p.email, email: p.email } });
  }
  for (const w of waitlist) {
    const person = byEmail.get(w.email);
    records.push({
      entity: "form_submission",
      data: {
        form_key: "call_sheet",
        email: w.email,
        answers: Object.fromEntries(Object.entries({ zip: w.zip, category: w.category, details: w.details }).filter(([, v]) => v)),
        placement: w.placement,
        submitted_at: w.createdAt,
        // As Company OS's importer writes it (2.0's scripts/import-waitlist.mjs): later submissions merge by this key.
        updated_at: w.createdAt,
        unique_key: `call_sheet\n${w.email}`,
        ...(person ? { person: uuid(`person:${person.id}`) } : {}),
      },
    });
  }
  // The six pictures: their own people use them, and every other profile past draft borrows one, since Company OS
  // needs a photo to submit or approve (each profile gets its own file record; the images are shared on disk).
  const pictures = state.drafts.map((d) => d.fields.photo).filter((src) => src.startsWith("img/people/"));
  let borrowed = 0;
  for (const draft of state.drafts) {
    const person = state.people.find((p) => p.id === draft.personId)!;
    const profileId = uuid(`profile:${person.id}`);
    // A submitted (or reviewed) profile shows what was submitted; a draft shows the working copy.
    const fields = state.profiles.find((p) => p.personId === person.id)?.fields ?? draft.fields;
    const { data, items } = toProfile(fields);
    const status = ["draft", "submitted", "changes_requested", "approved"].includes(person.status) ? person.status : "draft";
    records.push({
      entity: "profile",
      id: profileId,
      data: {
        ...data,
        person: uuid(`person:${person.id}`),
        public_handle: person.slug || person.id,
        status,
        ...(person.submittedAt ? { submitted_at: person.submittedAt } : {}),
        ...(person.approvedAt || person.status === "changes_requested" ? { reviewed_at: person.approvedAt ?? person.updatedAt } : {}),
      },
    });
    items.forEach((item, i) => records.push({ entity: "profile_item", id: uuid(`item:${person.id}:${i}`), data: { ...item, profile: profileId } }));
    if (person.status === "changes_requested" && person.reviewNotes?.length) {
      records.push({
        entity: "profile_review",
        data: {
          profile: profileId,
          from_status: "submitted",
          to_status: "changes_requested",
          note: person.reviewNotes.map((n) => `${sectionLabel[n.section]}: ${n.note}`).join("\n"),
          section_notes: Object.fromEntries(person.reviewNotes.map((n) => [n.section, n.note])),
          created_at: person.updatedAt,
        },
      });
    }
    if (person.status === "approved") {
      records.push({ entity: "profile_review", data: { profile: profileId, from_status: "submitted", to_status: "approved", note: "Approved", section_notes: {}, created_at: person.approvedAt } });
    }
    const picture = fields.photo.startsWith("img/people/") ? fields.photo : status !== "draft" ? pictures[borrowed++ % pictures.length] : undefined;
    if (picture) {
      const name = picture.replace(/^img\/people\//, "");
      files.push({ owner_entity: "profile", owner_id: profileId, kind: "photo", path: `between-gigs/${name}`, mime: "image/jpeg", source: picture });
    }
  }
  return {
    fictional: true,
    _about: "Between Gigs 2.0's made-up sample (lib/data/seed.ts in Between-Gigs/between-gig-2.0), generated by its scripts/seed-companyos.ts. Every person, address (example.com), credit and photo is fictional. Do not edit by hand: regenerate.",
    records,
    files,
  };
}
