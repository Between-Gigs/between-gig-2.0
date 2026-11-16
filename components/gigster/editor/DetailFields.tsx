"use client";
/*
 * Profile details (Company OS profiles 1.10.0), behind NEXT_PUBLIC_PROFILE_DETAILS: how you charge, the LinkedIn link
 * and the private contact choices. The canvas shows these only when the flag is on (lib/profile/details.ts).
 * Wording of the two consents and the privacy line is a draft until Justin and Patti sign it off.
 */
import { Checkbox, Field, Input } from "@ds/components";
import type { PhoneChannel } from "@/lib/profile/details";
import type { SectionProps } from "./ui";

/** Hourly and/or By Project, with the amount and optional minimums each needs. The older rate and basis follow. */
export function RateOptionFields({ d, set, errors }: SectionProps) {
  const options = d.rateOptions ?? [];
  const hourly = options.includes("hourly"), project = options.includes("project");
  const toggle = (kind: "hourly" | "project", on: boolean) => {
    const next = on ? [...options.filter((o) => o !== kind), kind] : options.filter((o) => o !== kind);
    set("rateOptions")(next);
    if (next.includes("hourly")) { set("basis")("hourly"); set("rate")((d.hourlyRate ?? "").trim()); }
    else if (next.includes("project")) { set("basis")("project"); set("rate")((d.projectMinimum ?? "").trim()); }
    else set("rate")("");
  };
  const amount = (v: string) => v.replace(/[^0-9.]/g, "").slice(0, 8);
  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-3" aria-describedby={errors.rateOptions ? "f-rateOptions-error" : undefined}>
        <legend className="mb-1 text-label-md text-ink">How you charge</legend>
        <p className="text-body-sm text-ink-muted">Choose at least one. You can offer both.</p>
        <Checkbox id="f-rateOptions" label="Hourly" checked={hourly} onChange={(e) => toggle("hourly", e.target.checked)} />
        <Checkbox id="f-rateOption-project" label="By Project" checked={project} onChange={(e) => toggle("project", e.target.checked)} />
        {errors.rateOptions && <p id="f-rateOptions-error" role="alert" className="text-body-sm text-danger">{errors.rateOptions}</p>}
      </fieldset>
      {hourly && (
        <>
          <Field label="Hourly amount" error={errors.hourlyRate}>
            <Input id="f-rate" inputMode="decimal" value={d.hourlyRate ?? ""} invalid={!!errors.hourlyRate} start={<span>$</span>} end={<span>USD / hour</span>}
              onChange={(e) => { const v = amount(e.target.value); set("hourlyRate")(v); set("rate")(v); set("basis")("hourly"); }} />
          </Field>
          <Field label="Minimum number of hours" optional error={errors.minimumHours}>
            <Input id="f-minimumHours" inputMode="numeric" maxLength={4} value={d.minimumHours ?? ""} invalid={!!errors.minimumHours}
              onChange={(e) => set("minimumHours")(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </Field>
        </>
      )}
      {project && (
        <Field label="Minimum project price" optional error={errors.projectMinimum}>
          <Input id="f-projectMinimum" inputMode="decimal" value={d.projectMinimum ?? ""} invalid={!!errors.projectMinimum} start={<span>$</span>} end={<span>USD</span>}
            onChange={(e) => { const v = amount(e.target.value); set("projectMinimum")(v); if (!hourly) { set("rate")(v); set("basis")("project"); } }} />
        </Field>
      )}
    </div>
  );
}

/** A personal or company LinkedIn page, public on the profile. */
export function LinkedInField({ d, set, errors }: SectionProps) {
  return (
    <Field label="LinkedIn link" optional error={errors.linkedin} hint="Your personal or company page. It appears on your public profile.">
      <Input id="f-linkedin" type="url" inputMode="url" maxLength={500} value={d.linkedin ?? ""} placeholder="https://www.linkedin.com/in/your-name" invalid={!!errors.linkedin}
        onChange={(e) => set("linkedin")(e.target.value.trim())} />
    </Field>
  );
}

const CHANNELS: readonly (readonly [PhoneChannel, string])[] = [["sms", "SMS"], ["phone", "Phone calls"], ["whatsapp", "WhatsApp"]];

/** Under the phone number: which channels it works on, then the two separate, unticked-by-default consents. Private. */
export function ContactChoices({ d, set }: Pick<SectionProps, "d" | "set">) {
  const channels = d.contactChannels ?? [];
  return (
    <div className="grid max-w-prose gap-4">
      <fieldset className="grid gap-3">
        <legend className="mb-1 text-label-md text-ink">This number works for</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {CHANNELS.map(([value, label]) => (
            <Checkbox key={value} id={`f-channel-${value}`} label={label} checked={channels.includes(value)}
              onChange={(e) => set("contactChannels")(e.target.checked ? [...channels.filter((c) => c !== value), value] : channels.filter((c) => c !== value))} />
          ))}
        </div>
      </fieldset>
      <Checkbox id="f-bookingContactConsent" checked={d.bookingContactConsent === true} onChange={(e) => set("bookingContactConsent")(e.target.checked)}
        label="Between Gigs may share my contact details with clients and contact me about bookings and projects." />
      <Checkbox id="f-marketingEmailConsent" disabled={d.marketingSuppressed === true} aria-describedby={d.marketingSuppressed || d.marketingNotice ? "f-marketing-note" : undefined} checked={d.marketingEmailConsent === true} onChange={(e) => set("marketingEmailConsent")(e.target.checked)}
        label="Send me Between Gigs news, opportunities and updates by email. I can unsubscribe at any time." />
      {d.marketingSuppressed ? <p id="f-marketing-note" role="status" className="text-body-sm text-ink-muted">You asked us not to send marketing email. Contact hello@between-gigs.com to change this.</p>
        : d.marketingNotice ? <p id="f-marketing-note" role="alert" className="text-body-sm text-danger">{d.marketingNotice}</p> : null}
      <p className="text-body-sm text-ink-muted">We never sell your details. See our <a className="text-link underline underline-offset-2" href="/privacy/">Privacy Policy</a>.</p>
    </div>
  );
}
