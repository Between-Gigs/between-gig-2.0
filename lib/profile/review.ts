import { parseSample } from "./work-fit";
import type { ProfileFields, ShowcaseItem } from "@/lib/data/types";
import type { FieldErrors } from "./validate";
export const TRAVEL_OPTIONS = ["Up to 5 miles", "Up to 15 miles", "Up to 25 miles", "Up to 50 miles"];
export const REVIEW_PUBLIC_FIELD = "public_details";
export const REVIEW_PRIVATE_FIELD = "private_details";
export const REVIEW_PUBLIC_KEYS = ["travelBeyondLA", "rateOptions", "hourlyRate", "projectMinimum", "minimumHours", "linkedin", "showcase", "title", "serviceLines", "personalityQuestion", "personality", "resumeUrl", "earliestStart", "hireableJobs", "skills"] as const;
export const REVIEW_PRIVATE_KEYS = ["bookingMobile", "contactChannels", "bookingContactConsent", "marketingEmailConsent", "insuranceNotes"] as const;
export const REVIEW_KEYS = [...REVIEW_PUBLIC_KEYS, ...REVIEW_PRIVATE_KEYS] as const;
export const PROFILE_REVIEW_ENABLED = process.env.NEXT_PUBLIC_DATA_SOURCE !== "api" || process.env.NEXT_PUBLIC_PROFILE_REVIEW === "1";
export const validPostalCode = (market: string, value: string) => market === "la" ? /^\d{5}$/.test(value) : /^[\p{L}\p{N}][\p{L}\p{N} -]{0,19}$/u.test(value.trim());
export const rateChoices = (f: ProfileFields): ("hourly" | "project")[] => f.rateOptions ?? (f.rate && f.basis !== "day" ? [f.basis] : []);
export const safeMediaUrl = (value: unknown): string => {
    if (typeof value !== "string" || value.length > 2048)
        return "";
    if (/^\/media\/[0-9a-f-]{36}$/i.test(parseSample(value).src))
        return value;
    try {
        const u = new URL(value);
        return u.protocol === "https:" && !u.username && !u.password ? u.href : "";
    }
    catch {
        return "";
    }
};
const text = (v: unknown, max: number) => typeof v === "string" ? v.slice(0, max) : "";
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
export function cleanReviewFields(input: unknown): Partial<ProfileFields> {
    const v = record(input), out: Partial<ProfileFields> = {};
    for (const k of ["travelBeyondLA", "bookingContactConsent", "marketingEmailConsent", "marketingConsentBaseline", "marketingPreferenceConfigured"] as const)
        if (k in v)
            out[k] = v[k] === true;
    for (const k of ["hourlyRate", "projectMinimum", "minimumHours"] as const)
        if (k in v)
            out[k] = text(v[k], 12);
    for (const k of ["linkedin", "resumeUrl"] as const)
        if (k in v)
            out[k] = text(v[k], 500);
    if ("insuranceNotes" in v)
        out.insuranceNotes = text(v.insuranceNotes, 400);
    if (Array.isArray(v.rateOptions))
        out.rateOptions = [...new Set(v.rateOptions.filter((x): x is "hourly" | "project" => x === "hourly" || x === "project"))];
    if (Array.isArray(v.contactChannels))
        out.contactChannels = [...new Set(v.contactChannels.filter((x): x is "sms" | "phone" | "whatsapp" => ["sms", "phone", "whatsapp"].includes(String(x))))];
    if ("showcase" in v)
        out.showcase = (Array.isArray(v.showcase) ? v.showcase : []).slice(0, 5).flatMap(raw => {
            const item = record(raw), url = safeMediaUrl(item.url);
            if (!url || !["image", "video"].includes(String(item.kind)))
                return [];
            return [{ id: text(item.id, 80), kind: item.kind as ShowcaseItem["kind"], url, thumbnail: safeMediaUrl(item.thumbnail), description: text(item.description, 160) }];
        });
    return out;
}
export const publicReviewDetails = (f: ProfileFields) => Object.fromEntries(REVIEW_PUBLIC_KEYS.map(k => [k, f[k]]).filter(([, v]) => v !== undefined));
export const privateReviewDetails = (f: ProfileFields) => Object.fromEntries(REVIEW_PRIVATE_KEYS.map(k => [k, f[k]]).filter(([, v]) => v !== undefined));
export function reviewErrors(f: ProfileFields): FieldErrors {
    const e: FieldErrors = {}, choices = rateChoices(f);
    const money = (value: string | undefined) => !!value && /^\d+(?:\.\d{1,2})?$/.test(value) && Number.isFinite(Number(value)) && Number(value) > 0;
    if (!TRAVEL_OPTIONS.includes(f.travel))
        e.travel = "Choose how far you’re willing to travel.";
    if (!choices.length)
        e.rateOptions = "Choose Hourly, By Project, or both.";
    if (choices.includes("hourly") && !money(f.hourlyRate ?? (f.basis === "hourly" ? f.rate : "")))
        e.hourlyRate = "Enter an hourly amount greater than zero.";
    if (f.projectMinimum && !money(f.projectMinimum))
        e.projectMinimum = "Enter a minimum greater than zero, or leave it blank.";
    if (f.minimumHours && (!Number.isInteger(Number(f.minimumHours)) || Number(f.minimumHours) < 1 || Number(f.minimumHours) > 168))
        e.minimumHours = "Enter a whole number from 1 to 168, or leave it blank.";
    if (f.linkedin && !/^https:\/\/(www\.)?linkedin\.com\/in\/[^\s]+\/?$/.test(f.linkedin))
        e.linkedin = "Use your https://www.linkedin.com/in/ profile link, or leave it blank.";
    if (f.tools.split(/\r?\n/).length > 5)
        e.tools = "Keep tools and equipment to five lines.";
    if (f.bookingMobile && (f.contactChannels?.length ?? 0) > 0 && !f.bookingContactConsent)
        e.bookingContactConsent = "Allow booking and project contact for the methods you selected, or clear those methods.";
    if ((f.contactChannels?.length ?? 0) > 0 && (!/^\+?[0-9 ()-]{7,32}$/.test(f.bookingMobile ?? "") || (f.bookingMobile ?? "").replace(/\D/g, "").length < 7 || (f.bookingMobile ?? "").replace(/\D/g, "").length > 15))
        e.bookingMobile = "Enter a valid phone number, including the country code.";
    if ((f.services.length + (f.other.trim() ? 1 : 0)) > 5)
        e.services = "Choose up to five services, including Other.";
    return e;
}
