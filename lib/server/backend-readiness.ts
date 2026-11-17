/*
 * Is the backend ready for the features this build turns on? Each profile feature flag needs a minimum profiles-module
 * version in Company OS. Instead of a person attesting that (the old "library receipt"), the server asks Company OS
 * what the public reader can see (GET /meta/entities) and looks for a field that exists only once that version is
 * installed. /healthz/ answers 503 while a feature is missing, so Railway's deploy healthcheck keeps the old version
 * serving. Server only. Nothing here returns an address or token.
 */
import { CompanyOsError, companyOs, configFromEnv } from "./companyos";

export type Feature = "departmentRetirement" | "customServiceReview" | "locationControls" | "customSkills" | "travelPreference" | "publishGate" | "profileDetails" | "videoLinks";
export type Entities = { key: string; fields: { key: string }[] }[];
export type Readiness = { ready: boolean; missing: Feature[] };

/*
 * Marker fields as "entity.field". The public reader's meta lists only the fields its policy allows
 * (Company OS profiles module, PUBLIC_PROFILE_FIELDS_* / PUBLIC_ITEM_FIELDS), and only two fields are both public and
 * introduced after 1.7, so these are the closest proofs:
 * - profile.extended_travel_available (introduced 1.8.0) proves 1.8 or later. Features from 1.5, 1.6 and 1.7 have no
 *   public marker of their own; 1.8 or later proves them (and the department retirement, which has no version of its own).
 * - profile.public_details and profile_item.thumbnail (introduced 1.10.0) prove 1.10. The publish gate (1.9/1.10) has
 *   only private fields (publish_held), so it uses public_details, which proves 1.10 and therefore the gate.
 */
export const FEATURE_MARKERS: Record<Feature, string[]> = {
  departmentRetirement: ["profile.extended_travel_available"],
  customServiceReview: ["profile.extended_travel_available"],
  locationControls: ["profile.extended_travel_available"],
  customSkills: ["profile.extended_travel_available"],
  travelPreference: ["profile.extended_travel_available"],
  publishGate: ["profile.public_details"],
  profileDetails: ["profile.public_details"],
  videoLinks: ["profile_item.thumbnail"],
};

type FlagEnv = Record<string, string | undefined>;

/** The public flags are inlined at build time, so each is named literally here (a dynamic process.env[name] would not be). */
export function readinessFlags(): FlagEnv {
  return {
    NEXT_PUBLIC_PROFILE_NO_DEPARTMENT: process.env.NEXT_PUBLIC_PROFILE_NO_DEPARTMENT,
    NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW: process.env.NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW,
    CUSTOM_SERVICE_REVIEW_ENABLED: process.env.CUSTOM_SERVICE_REVIEW_ENABLED,
    NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS: process.env.NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS,
    NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS: process.env.NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS,
    NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE: process.env.NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE,
    NEXT_PUBLIC_PROFILE_PUBLISH_GATE: process.env.NEXT_PUBLIC_PROFILE_PUBLISH_GATE,
    NEXT_PUBLIC_PROFILE_VIDEO_LINKS: process.env.NEXT_PUBLIC_PROFILE_VIDEO_LINKS,
    NEXT_PUBLIC_PROFILE_DETAILS: process.env.NEXT_PUBLIC_PROFILE_DETAILS,
  };
}

/** Features this build turns on. */
export function enabledFeatures(flags: FlagEnv): Feature[] {
  const on = (name: string) => flags[name] === "1";
  return ([
    on("NEXT_PUBLIC_PROFILE_NO_DEPARTMENT") && "departmentRetirement",
    (on("NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW") || on("CUSTOM_SERVICE_REVIEW_ENABLED")) && "customServiceReview",
    on("NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS") && "locationControls",
    on("NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS") && "customSkills",
    on("NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE") && "travelPreference",
    on("NEXT_PUBLIC_PROFILE_PUBLISH_GATE") && "publishGate",
    on("NEXT_PUBLIC_PROFILE_DETAILS") && "profileDetails",
    on("NEXT_PUBLIC_PROFILE_VIDEO_LINKS") && "videoLinks",
  ] as (Feature | false)[]).filter((f): f is Feature => f !== false).sort();
}

/** Pure: which of the features lack a marker in what the public reader can see. */
export function checkReadiness(features: Feature[], entities: Entities): Readiness {
  const seen = new Set(entities.flatMap(e => e.fields.map(f => `${e.key}.${f.key}`)));
  const missing = features.filter(f => FEATURE_MARKERS[f].some(m => !seen.has(m))).sort();
  return { ready: missing.length === 0, missing };
}

const READY_TTL_MS = 60_000;
const NOT_READY_TTL_MS = 5_000;
const TIMEOUT_MS = 3_000;
let cache: { at: number; key: string; result: Readiness } | undefined;
export const resetReadinessCache = () => { cache = undefined; };

export interface ReadinessOptions {
  flags?: FlagEnv;
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
}

/** Cached (60 s when ready, 5 s when not, so a fix shows quickly). Any Company OS failure or timeout is "not ready". */
export async function backendReadiness(opts: ReadinessOptions = {}): Promise<Readiness> {
  const features = enabledFeatures(opts.flags ?? readinessFlags());
  if (!features.length) return { ready: true, missing: [] };
  const now = (opts.now ?? Date.now)();
  const key = features.join(",");
  if (cache && cache.key === key && now - cache.at < (cache.result.ready ? READY_TTL_MS : NOT_READY_TTL_MS)) return cache.result;
  const notReady: Readiness = { ready: false, missing: features };
  let result: Readiness;
  try {
    const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
    const cfg = configFromEnv(opts.env ?? process.env);
    const cos = companyOs({ ...cfg, fetch: opts.fetch, timeoutMs });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new CompanyOsError(504, "timeout")), timeoutMs); });
    try {
      const meta = await Promise.race([cos.call<{ entities?: Entities }>({ kind: "reader" }, "GET", "/meta/entities"), deadline]);
      result = Array.isArray(meta?.entities) ? checkReadiness(features, meta.entities.map(e => ({ key: e.key, fields: Array.isArray(e.fields) ? e.fields : [] }))) : notReady;
    } finally { clearTimeout(timer); }
  } catch {
    result = notReady;
  }
  cache = { at: now, key, result };
  return result;
}
