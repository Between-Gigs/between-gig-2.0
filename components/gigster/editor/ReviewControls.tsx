"use client";
import * as React from "react";
import { Button, Checkbox, Field, Input, RadioGroup, Select } from "@ds/components";
import { X } from "lucide-react";
import { onSetSkills } from "@/lib/data/taxonomy";
import { rateChoices, TRAVEL_OPTIONS } from "@/lib/profile/review";
import type { SectionProps } from "./ui";
export function ReviewLocation({ d, set, errors }: SectionProps) {
    return <div id="sec-where" className="grid scroll-mt-40 gap-4">
    <RadioGroup name="f-market" label="Where you’re based" orientation="horizontal" value={d.market} onChange={v => set("market")(v as typeof d.market)} options={[{ value: "la", label: "Los Angeles" }, { value: "other", label: "Somewhere else" }]}/>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={d.market === "la" ? "ZIP code" : "ZIP or postal code"} error={errors.zip}>
        <Input id="f-zip" autoComplete="postal-code" inputMode={d.market === "la" ? "numeric" : "text"} maxLength={d.market === "la" ? 5 : 20} value={d.zip} placeholder={d.market === "la" ? "90026" : "ZIP or postal code"} onChange={e => set("zip")(d.market === "la" ? e.target.value.replace(/\D/g, "").slice(0, 5) : e.target.value.slice(0, 20))}/>
      </Field>
      <Field label="Travel radius" error={errors.travel}><Select id="f-travel" placeholder="Choose a distance" value={d.travel} options={TRAVEL_OPTIONS.map(value => ({ value, label: value }))} onValueChange={set("travel")}/></Field>
    </div>
    {d.market === "other" && <Field label="City / region and country" error={errors.otherCity}><Input id="f-otherCity" value={d.otherCity} maxLength={120} onChange={e => set("otherCity")(e.target.value)}/></Field>}
    <Checkbox id="f-travelBeyondLA" checked={d.travelBeyondLA === true} onChange={e => set("travelBeyondLA")(e.target.checked)} label="I’m willing to travel beyond Los Angeles."/>
    <p className="text-body-sm text-ink-muted italic">Your home address stays private.</p>
  </div>;
}
export function SkillTags({ d, set, errors }: SectionProps) {
    const [query, setQuery] = React.useState("");
    const [problem, setProblem] = React.useState("");
    const choose = (value: string) => { const s = value.trim().slice(0, 60); if (!s) {
        setProblem("Type a skill or choose a suggestion.");
        return;
    } if (d.skills.length >= 20) {
        setProblem("Choose up to 20 skills.");
        return;
    } if (!d.skills.some(x => x.toLowerCase() === s.toLowerCase())) {
        set("skills")([...d.skills, s]);
        if (!d.position)
            set("position")(s.slice(0, 40));
    } setQuery(""); setProblem(""); };
    const suggestions = onSetSkills.filter(s => !d.skills.includes(s) && s.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8);
    return <div className="grid gap-3"><label htmlFor="f-skills" className="text-label-md text-ink">On-set skills</label>
    <div className="flex flex-wrap gap-2" aria-label="Selected skills">{d.skills.map(s => <button type="button" key={s} aria-label={"Remove " + s} onClick={() => set("skills")(d.skills.filter(x => x !== s))} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink-brand bg-surface-selected px-3 text-label-md text-ink focus-visible:outline-2 focus-visible:outline-focus">{s}<X className="size-4" aria-hidden="true"/></button>)}</div>
    <div className="flex gap-2"><Input id="f-skills" value={query} maxLength={60} placeholder="Search skills or add your own" onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") {
        e.preventDefault();
        choose(query);
    } }}/><Button variant="secondary" onClick={() => choose(query)}>Add skill</Button></div>
    {suggestions.length > 0 && <div aria-label="Suggested skills" className="flex flex-wrap gap-2">{suggestions.map(s => <button key={s} type="button" onClick={() => choose(s)} className="min-h-11 rounded-full border border-line-strong px-3 text-label-sm text-ink hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus">{s}</button>)}</div>}
    {(problem || errors.skills) && <p role="status" className="text-body-sm text-danger">{problem || errors.skills}</p>}
  </div>;
}
export function RateFields({ d, set, errors }: SectionProps) {
    const choices = rateChoices(d), hourly = choices.includes("hourly"), project = choices.includes("project");
    const select = (kind: "hourly" | "project", on: boolean) => { const next = on ? [...choices, kind] : choices.filter(k => k !== kind); set("rateOptions")(next); if (next.includes("hourly")) {
        set("basis")("hourly");
        set("rate")(d.hourlyRate ?? (d.basis === "hourly" ? d.rate : ""));
    }
    else if (next.includes("project")) {
        set("basis")("project");
        set("rate")(d.projectMinimum ?? (d.basis === "project" ? d.rate : ""));
    }
    else
        set("rate")(""); };
    return <div className="grid gap-4"><fieldset className="grid gap-3"><legend className="mb-3 text-label-md text-ink">How you charge</legend><p className="text-body-sm text-ink-muted">Choose at least one. You can offer both.</p>
    <Checkbox label="Hourly" checked={hourly} onChange={e => select("hourly", e.target.checked)}/><Checkbox label="By Project" checked={project} onChange={e => select("project", e.target.checked)}/>
    {errors.rateOptions && <p className="text-body-sm text-danger">{errors.rateOptions}</p>}</fieldset>
    {hourly && <><Field label="Hourly amount" error={errors.hourlyRate}><Input id="f-rate" inputMode="decimal" value={d.hourlyRate ?? (d.basis === "hourly" ? d.rate : "")} start={<span>$</span>} end={<span>USD / hour</span>} onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, "").slice(0, 8); set("hourlyRate")(v); set("rate")(v); set("basis")("hourly"); }}/></Field><Field label="Minimum number of hours" optional error={errors.minimumHours}><Input id="f-minimumHours" inputMode="numeric" value={d.minimumHours ?? ""} maxLength={3} onChange={e => set("minimumHours")(e.target.value.replace(/\D/g, "").slice(0, 3))}/></Field></>}
    {project && <Field label="Minimum project price" optional error={errors.projectMinimum}><Input id={hourly ? "f-projectMinimum" : "f-rate"} inputMode="decimal" value={d.projectMinimum ?? (d.basis === "project" ? d.rate : "")} start={<span>$</span>} end={<span>USD</span>} onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, "").slice(0, 8); set("projectMinimum")(v); if (!hourly) {
        set("rate")(v);
        set("basis")("project");
    } }}/></Field>}
    <p className="text-body-sm text-ink-muted">Materials and travel can be agreed to separately as needed.</p>
  </div>;
}
export function ContactFields({ d, set, errors, email }: SectionProps & {
    email: string;
}) {
    const channels = d.contactChannels ?? [];
    return <section id="sec-contact" aria-labelledby="sec-contact-h" className="grid scroll-mt-40 gap-5"><div className="grid gap-2"><h2 id="sec-contact-h" className="font-display text-heading-lg text-ink">Contact Information</h2><p className="text-body-sm text-ink-muted">Your contact details stay private. Choose how Between Gigs may reach you.</p></div>
    <div className="grid gap-4 sm:max-w-2xl sm:grid-cols-2"><Field label="Mobile number" optional error={errors.bookingMobile}><Input id="f-mobile" type="tel" inputMode="tel" autoComplete="tel" value={d.bookingMobile ?? ""} maxLength={32} placeholder="+1 213 555 0123" onChange={e => { set("bookingMobile")(e.target.value); if (d.bookingContactConsent)
        set("bookingContactConsent")(false); }}/></Field><div className="grid content-start gap-1.5"><p className="text-label-md text-ink">Email</p><p className="min-h-10 break-all text-body-md text-ink-muted">{email || "Your account email"}</p></div></div>
    <fieldset className="grid gap-3"><legend className="mb-3 text-label-md text-ink">This number works with</legend><div className="flex flex-wrap gap-x-6 gap-y-3">{([['sms', 'SMS'], ['phone', 'Phone calls'], ['whatsapp', 'WhatsApp']] as const).map(([value, label]) => <Checkbox key={value} label={label} checked={channels.includes(value)} onChange={e => { set("contactChannels")(e.target.checked ? [...channels, value] : channels.filter(c => c !== value)); set("bookingContactConsent")(false); }}/>)}</div></fieldset>
    <div className="grid max-w-prose gap-4"><Checkbox id="f-bookingContactConsent" label="I agree to be contacted by Between Gigs about bookings and projects using the methods I selected above." checked={d.bookingContactConsent === true} onChange={e => set("bookingContactConsent")(e.target.checked)} description="Optional. You can change your choices or withdraw permission at any time. Your number is not shared publicly."/>
    {channels.includes("sms") && <p className="text-body-sm text-ink-muted">Selecting SMS and giving permission authorizes booking and project-related text messages to this number. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to join.</p>}
    {errors.bookingContactConsent && <p className="text-body-sm text-danger">{errors.bookingContactConsent}</p>}
    <Checkbox id="f-marketingEmailConsent" label="Email me Between Gigs news, general updates, and offers." checked={d.marketingEmailConsent === true} onChange={e => set("marketingEmailConsent")(e.target.checked)} description="Optional and separate from booking messages. You can unsubscribe from marketing emails at any time. This does not authorize marketing calls or texts."/>
    </div>
  </section>;
}
