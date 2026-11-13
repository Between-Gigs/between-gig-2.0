import { Field, Input, Textarea } from "@ds/components";
import type { ProfileFields } from "@/lib/data/types";
import type { ProfileFieldRule } from "@/lib/profile/template";
import { stageTwoLimits, type StageTwoField } from "@/lib/profile/stage-two";
import { DateField } from "@/components/ui/DateField";

interface Props {
  fields: ProfileFields;
  email: string;
  set: (key: StageTwoField) => (value: string) => void;
  required: readonly ProfileFieldRule[];
  errors?: Partial<Record<StageTwoField, string>>;
}

/** The questionnaire and the inline Work details spot edit the same draft answers. */
export function BookingFields({ fields: f, email, set, required, errors = {} }: Props) {
  const optional = (key: StageTwoField) => !required.includes(key);
  return (
    <div className="grid gap-4">
      <Field label="Jobs people can hire me for" optional={optional("hireableJobs")} error={errors.hireableJobs}
        hint="In one or two sentences, name the actual jobs you’ll take.">
        <Textarea id="f-hireableJobs" rows={2} maxLength={stageTwoLimits.hireableJobs} value={f.hireableJobs ?? ""}
          placeholder="I sketch room layouts and source lighting and furnishings for lived-in spaces." onChange={(e) => set("hireableJobs")(e.target.value)} />
      </Field>
      <Field label="Earliest start date" optional={optional("earliestStart")} error={errors.earliestStart}
        hint="The first calendar day you could start a project.">
        <DateField id="f-earliestStart" value={f.earliestStart ?? ""} invalid={!!errors.earliestStart} onChange={set("earliestStart")} />
      </Field>
      <Field label="Minimum booking" optional={optional("bookingMinimum")} error={errors.bookingMinimum}>
        <Input id="f-bookingMinimum" maxLength={stageTwoLimits.bookingMinimum} value={f.bookingMinimum ?? ""}
          placeholder="e.g. Two hours, half a day, or one project" onChange={(e) => set("bookingMinimum")(e.target.value)} />
      </Field>
      <Field label="What’s one thing about you that would make a client smile?" optional={optional("personality")} error={errors.personality}>
        <Textarea id="f-personality" rows={2} maxLength={stageTwoLimits.personality} value={f.personality ?? ""}
          placeholder="My emergency kit always includes cake candles." onChange={(e) => set("personality")(e.target.value)} />
      </Field>
      <Field label="Private booking mobile" optional={optional("bookingMobile")} error={errors.bookingMobile}
        hint="For the Between Gigs team. Your mobile and account email stay off your public profile. Use a sample number in this preview.">
        <Input id="f-bookingMobile" type="tel" inputMode="tel" autoComplete="off" maxLength={stageTwoLimits.bookingMobile}
          value={f.bookingMobile ?? ""} placeholder="+1 213-555-0100" onChange={(e) => set("bookingMobile")(e.target.value)} />
      </Field>
      {email && <p className="text-body-sm text-ink-muted">Private booking email · <span className="break-all text-ink">{email}</span></p>}
    </div>
  );
}
