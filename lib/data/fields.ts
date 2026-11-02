/*
 * The few sample-free helpers both the live app and the sample use. They live here, not in seed.ts, so that importing
 * them from a live page never bundles the made-up people (scripts/check-split.mjs looks for them).
 */
import type { ProfileFields } from "./types";

/** The sample's owner login (the sample email-code sign-in only). */
export const SAMPLE_OWNER = { email: "owners@between-gigs.example", name: "Owner (sample)" } as const;

/** An empty questionnaire. */
export const blankFields = (name = ""): ProfileFields => ({
  photo: "", name, years: "", position: "", imdb: "", credits: [""],
  skills: [], services: [], other: "",
  market: "la", otherCity: "", zip: "", areas: [], travel: "", month: "November 2026", monthStatus: "available", dates: "", rate: "", basis: "hourly",
  about: "", languages: "", insurance: "private", tools: "", transport: "", mode: "on-site",
});

/** The sample's invitation tokens, one per state. */
export const DEMO_TOKENS = { valid: "riley-7q2m", used: "grace-3k8d", expired: "sky-9x4p", unknown: "not-a-real-invite" } as const;
