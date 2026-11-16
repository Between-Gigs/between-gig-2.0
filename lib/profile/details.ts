/*
 * Profile details (Company OS profiles 1.10.0): public rates and a LinkedIn link in `public_details`, private contact
 * choices in `private_details`, and the marketing-email consent (an action on the module, not stored data).
 * Everything here is behind NEXT_PUBLIC_PROFILE_DETAILS (default off): with it off no field, request or link appears.
 * Draft saves send only what the module accepts, so an autosave mid-edit is never refused; the editor's checks
 * (`detailsErrors`) say what is still missing before the profile is sent for review.
 */
import type { ProfileFields } from "@/lib/data/types";
import type { FieldErrors } from "./validate";

export const profileDetailsEnabled = () => process.env.NEXT_PUBLIC_PROFILE_DETAILS === "1";

/** The module's rule: https, linkedin.com or www.linkedin.com, a /in/ or /company/ page. */
export const LINKEDIN_RE = /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9._%-]{1,100}\/?$/;
export const PHONE_CHANNELS = ["sms", "phone", "whatsapp"] as const;
export type PhoneChannel = (typeof PHONE_CHANNELS)[number];
export const PRIVATE_ANSWER_KEYS = ["contactChannels", "bookingContactConsent", "marketingEmailConsent", "marketingConsentBaseline", "bookingMobile"] as const;

const money = (v: string | undefined) => !!v && /^\d+(?:\.\d{1,2})?$/.test(v.trim()) && Number(v) > 0 && Number(v) <= 100000;
const whole = (v: string | undefined) => !!v && /^\d{1,4}$/.test(v.trim()) && Number(v) >= 1 && Number(v) <= 1000;
const has = (f: Pick<ProfileFields, "rateOptions">, o: "hourly" | "project") => f.rateOptions?.includes(o) === true;

/** A LinkedIn address safe to link to, or "". */
export const linkedinHref = (value: unknown): string => (typeof value === "string" && LINKEDIN_RE.test(value) ? value : "");

/** What is still missing or wrong, in the editor's words. Run when the flag is on. */
export function detailsErrors(f: ProfileFields): FieldErrors {
  const e: FieldErrors = {};
  if (!f.rateOptions?.length) e.rateOptions = "Choose Hourly, By Project, or both.";
  if (has(f, "hourly") && !money(f.hourlyRate)) e.hourlyRate = "Enter an hourly amount greater than zero.";
  if (has(f, "hourly") && f.minimumHours?.trim() && !whole(f.minimumHours)) e.minimumHours = "Enter a whole number of hours, or leave it blank.";
  if (has(f, "project") && f.projectMinimum?.trim() && !money(f.projectMinimum)) e.projectMinimum = "Enter a minimum greater than zero, or leave it blank.";
  if (f.linkedin?.trim() && !LINKEDIN_RE.test(f.linkedin.trim())) e.linkedin = "Use a link like https://www.linkedin.com/in/your-name or https://www.linkedin.com/company/your-company, or leave it blank.";
  return e;
}

/** The `public_details` a save sends: only what the module accepts, in a fixed key order. Undefined: nothing to send. */
export function publicDetails(f: ProfileFields): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  const options: string[] = [];
  const hourly = has(f, "hourly") && money(f.hourlyRate);
  if (hourly) options.push("hourly");
  if (has(f, "project")) options.push("project");
  if (options.length) out.rate_options = options;
  if (hourly) {
    out.hourly_amount = Number(f.hourlyRate);
    if (whole(f.minimumHours)) out.minimum_hours = Number(f.minimumHours);
  }
  if (has(f, "project") && money(f.projectMinimum)) out.minimum_project_price = Number(f.projectMinimum);
  const link = f.linkedin?.trim();
  if (link && LINKEDIN_RE.test(link)) out.linkedin_url = link;
  return Object.keys(out).length ? out : undefined;
}

/** The `private_details` a save sends. `marketing` is the person's changed choice, or undefined to leave it alone. */
export function privateDetails(f: ProfileFields, marketing?: boolean): Record<string, unknown> | undefined {
  const touched = f.contactChannels !== undefined || f.bookingContactConsent !== undefined || marketing !== undefined;
  if (!touched) return undefined;
  return {
    phone_channels: [...(f.contactChannels ?? [])],
    booking_consent: f.bookingContactConsent === true,
    ...(marketing === undefined ? {} : { marketing_consent: marketing }),
  };
}

/**
 * Whether this save carries a marketing choice. Only when the checkbox differs from what the editor loaded and the
 * server's current state is still what was loaded: a draft that went stale (an unsubscribe link was used since) can
 * never switch marketing email back on.
 */
export function marketingChange(f: ProfileFields, serverEnabled: boolean): boolean | undefined {
  if (typeof f.marketingEmailConsent !== "boolean") return undefined;
  const loaded = f.marketingConsentBaseline === true;
  if (f.marketingEmailConsent === loaded || serverEnabled !== loaded) return undefined;
  return f.marketingEmailConsent;
}

const text = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? String(v) : "");

export function readPublicDetails(raw: unknown): Partial<ProfileFields> {
  const d = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: Partial<ProfileFields> = {};
  if (Array.isArray(d.rate_options)) {
    const options = d.rate_options.filter((o): o is "hourly" | "project" => o === "hourly" || o === "project");
    if (options.length) out.rateOptions = options;
  }
  if (text(d.hourly_amount)) out.hourlyRate = text(d.hourly_amount);
  if (text(d.minimum_hours)) out.minimumHours = text(d.minimum_hours);
  if (text(d.minimum_project_price)) out.projectMinimum = text(d.minimum_project_price);
  if (linkedinHref(d.linkedin_url)) out.linkedin = d.linkedin_url as string;
  return out;
}

export function readPrivateDetails(raw: unknown): Partial<ProfileFields> {
  const d = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: Partial<ProfileFields> = {};
  if (Array.isArray(d.phone_channels)) out.contactChannels = d.phone_channels.filter((c): c is PhoneChannel => (PHONE_CHANNELS as readonly unknown[]).includes(c));
  if (typeof d.booking_consent === "boolean") out.bookingContactConsent = d.booking_consent;
  return out;
}

/** The new answers from a browser's questionnaire, kept to their own keys and types. A consent that is not a boolean is refused. */
export function cleanDetails(input: Record<string, unknown>): Partial<ProfileFields> {
  const out: Partial<ProfileFields> = {};
  if (Array.isArray(input.rateOptions)) out.rateOptions = [...new Set(input.rateOptions.filter((o): o is "hourly" | "project" => o === "hourly" || o === "project"))];
  for (const k of ["hourlyRate", "minimumHours", "projectMinimum"] as const) if (typeof input[k] === "string") out[k] = (input[k] as string).slice(0, 12);
  if (typeof input.linkedin === "string") out.linkedin = input.linkedin.slice(0, 500);
  if (Array.isArray(input.contactChannels)) out.contactChannels = [...new Set(input.contactChannels.filter((c): c is PhoneChannel => (PHONE_CHANNELS as readonly unknown[]).includes(c)))];
  for (const k of ["bookingContactConsent", "marketingEmailConsent", "marketingConsentBaseline"] as const) {
    if (input[k] === undefined) continue;
    if (typeof input[k] !== "boolean") throw new Error("invalid_private_details: " + k + " must be true or false");
    out[k] = input[k] as boolean;
  }
  return out;
}

/** A public response never carries the private answers, even if an upstream policy over-returns them. */
export function withoutPrivateDetails<T extends ProfileFields>(f: T): T {
  const out = { ...f } as Record<string, unknown>;
  for (const k of PRIVATE_ANSWER_KEYS) delete out[k];
  return out as unknown as T;
}
