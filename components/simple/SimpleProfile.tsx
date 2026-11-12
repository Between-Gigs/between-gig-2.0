"use client";
/*
 * A standalone, unstyled profile page with plain editing (A/B against /profile/canvas/).
 *
 * One page, two modes. "View" shows the profile as clients see it, in plain semantic HTML. "Edit" swaps the same
 * sections, in the same order, for ordinary form fields: no pop-ups, panels, sheets, drag handles or autosave.
 * Save keeps a draft; Send for review sends it to the team. It uses the same data layer as the current editor, so
 * both editors show the same profile. Styling is a small, plain stylesheet (styles/simple-profile.css) and nothing else:
 * no design-system components, no theme. That keeps the layout easy to judge and the code easy to change.
 */
import Link from "next/link";
import * as React from "react";
import { data, type PersonStatus, type ProfileFields } from "@/lib/data";
import { basisLabel, basisShort, insuranceLabel, laServiceAreas, modeLabel, monthStatusLabel, offSetServices, onSetSkills } from "@/lib/data/taxonomy";
import { useRequireRole } from "@/lib/guard";
import { ABOUT_MAX, DATES_MAX, DEPARTMENT_MAX, NAME_MAX, hasRate, validateAll, type FieldErrors } from "@/lib/profile/validate";
import { asset } from "@/lib/site";

const statusText: Record<PersonStatus, string> = {
  invited: "Not started", registered: "Not started", draft: "Draft: only you can see it",
  submitted: "With the team for review", changes_requested: "The team asked for a few changes", approved: "Live: clients can see it",
};

/** The fields in the order they appear on the page, with the label each error links to. */
const order: (keyof ProfileFields)[] = [
  "photo", "name", "position", "years", "imdb", "credits", "skills", "services", "market", "areas", "otherCity", "zip", "travel",
  "monthStatus", "dates", "earliestStart", "rate", "about", "languages", "mode", "tools", "transport", "insurance",
  "hireableJobs", "bookingMinimum", "personality", "bookingMobile",
];

export function SimpleProfile() {
  const session = useRequireRole("gigster");
  const personId = session?.personId ?? null;
  const [status, setStatus] = React.useState<PersonStatus | null>(null);
  const [slug, setSlug] = React.useState("");
  const [saved, setSaved] = React.useState<ProfileFields | null>(null);
  const [form, setForm] = React.useState<ProfileFields | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [busy, setBusy] = React.useState(false);
  const errorBox = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback((id: string) => Promise.all([data.people.get(id), data.profiles.getDraft(id)]).then(([summary, draft]) => {
    const fields = draft?.fields ?? summary?.fields ?? null;
    setStatus(summary?.person.status ?? null);
    setSlug(summary?.person.slug ?? "");
    setSaved(fields);
    setForm(fields);
  }), []);
  React.useEffect(() => {
    if (!personId) return;
    void Promise.all([data.people.get(personId), data.profiles.getDraft(personId)]).then(([summary, draft]) => {
      const fields = draft?.fields ?? summary?.fields ?? null;
      setStatus(summary?.person.status ?? null);
      setSlug(summary?.person.slug ?? "");
      setSaved(fields);
      setForm(fields);
    });
  }, [personId]);

  if (!session || !form || !saved) return <main className="simple-profile"><p>Loading your profile…</p></main>;
  const f = editing ? form : saved;
  const set = <K extends keyof ProfileFields>(k: K, v: ProfileFields[K]) => setForm((p) => (p ? { ...p, [k]: v } : p));
  const toggle = (k: "skills" | "services" | "areas", v: string) => set(k, form[k].includes(v) ? form[k].filter((x) => x !== v) : [...form[k], v]);
  const changed = JSON.stringify(form) !== JSON.stringify(saved);

  const save = async () => {
    if (!personId) return;
    setBusy(true);
    try {
      const d = await data.profiles.saveDraft(personId, form, 0);
      setSaved(d.fields); setForm(d.fields);
      setMessage(`Saved at ${new Date(d.savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
      return true;
    } catch {
      setMessage("Couldn't save. Check your connection and try again.");
      return false;
    } finally { setBusy(false); }
  };
  const done = async () => { if (await save()) { setEditing(false); setErrors({}); } };
  const cancel = () => { setForm(saved); setEditing(false); setErrors({}); setMessage(""); };
  const send = async () => {
    if (!personId) return;
    const all = Object.assign({}, ...Object.values(validateAll(form))) as FieldErrors;
    setErrors(all);
    if (Object.keys(all).length) {
      setEditing(true);
      setMessage("");
      requestAnimationFrame(() => errorBox.current?.focus());
      return;
    }
    if (changed && !(await save())) return;
    setBusy(true);
    try {
      await data.profiles.submit(personId);
      await load(personId);
      setEditing(false);
      setMessage("Sent. The team will review your profile and email you.");
    } catch {
      setMessage("Couldn't send. Try again in a moment.");
    } finally { setBusy(false); }
  };

  const err = (k: keyof ProfileFields) => errors[k] ? <p className="error" id={`${k}-error`}>{errors[k]}</p> : null;
  const described = (k: keyof ProfileFields) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});
  const errorList = order.filter((k) => errors[k]);
  const photoInput = async (file: File | undefined) => {
    if (!file || !personId) return;
    const url = data.profiles.uploadPhoto ? await data.profiles.uploadPhoto(personId, file)
      : await new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(file); });
    set("photo", url);
  };

  return (
    <main className="simple-profile" id="main">
      <nav aria-label="Profile pages" className="topbar">
        <Link href="/profile/">My profile</Link>
        <h1 className="page-title">Simple editor (test)</h1>
        <Link href="/profile/canvas/">Current editor</Link>
      </nav>

      <section aria-label="Profile status" className="status">
        <p><strong>Status:</strong> {status ? statusText[status] : "Unknown"}{status === "approved" && slug && <> · <Link href={`/p/${slug}/`}>See your live page</Link></>}</p>
        {status === "approved" && <p>Availability updates right away. Other changes wait for the team after you send them.</p>}
        <div className="actions">
          {editing ? <>
            <button type="button" onClick={done} disabled={busy}>Save</button>
            <button type="button" onClick={cancel} disabled={busy}>Cancel</button>
          </> : <button type="button" onClick={() => { setEditing(true); setMessage(""); }}>Edit profile</button>}
          {status !== "submitted" && <button type="button" onClick={send} disabled={busy}>{status === "approved" || status === "changes_requested" ? "Send again" : "Send for review"}</button>}
        </div>
        <p role="status" aria-live="polite" className="message">{message}{editing && changed && !message ? "You have unsaved changes." : ""}</p>
      </section>

      {errorList.length > 0 && (
        <div className="errors" role="alert" tabIndex={-1} ref={errorBox}>
          <h2>{errorList.length === 1 ? "1 thing to finish" : `${errorList.length} things to finish`} before sending</h2>
          <ul>{errorList.map((k) => <li key={k}><a href={`#f-${k}`}>{errors[k]}</a></li>)}</ul>
        </div>
      )}

      {/* 1. Who you are */}
      <section aria-labelledby="h-who">
        <h2 id="h-who">Who you are</h2>
        {editing ? <>
          <div className="field" id="f-photo">
            <label htmlFor="photo">Photo</label>
            {form.photo && <img src={asset(form.photo)} alt="Your current photo" className="photo" />}
            <input id="photo" type="file" accept="image/*" onChange={(e) => void photoInput(e.target.files?.[0])} {...described("photo")} />
            {err("photo")}
          </div>
          <Text k="name" label="Full name" max={NAME_MAX} form={form} set={set} err={err} described={described} />
          <Text k="position" label="Department or position" hint="Like Costume & wardrobe" max={DEPARTMENT_MAX} form={form} set={set} err={err} described={described} />
          <Text k="years" label="Years in the business" type="number" form={form} set={set} err={err} described={described} />
          <Text k="imdb" label="IMDb link (optional)" type="url" hint="https://www.imdb.com/name/nm…" form={form} set={set} err={err} described={described} />
          <div className="field" id="f-credits">
            <label htmlFor="credits">Credits</label>
            <p className="hint">One per line, like “The Long Night (2024), costume assistant”.</p>
            <textarea id="credits" rows={4} value={form.credits.join("\n")} onChange={(e) => set("credits", e.target.value.split("\n"))} {...described("credits")} />
            {err("credits")}
          </div>
        </> : <>
          {f.photo ? <img src={asset(f.photo)} alt={`Portrait of ${f.name}`} className="photo" /> : <p className="empty">No photo yet.</p>}
          <p className="profile-name">{f.name || "Your name"}</p>
          <p>{[f.position, f.years && `${f.years} years in the business`].filter(Boolean).join(" · ") || <span className="empty">No department yet.</span>}</p>
          {f.imdb && <p><a href={f.imdb}>IMDb</a></p>}
          <h3>Credits</h3>
          {f.credits.some((c) => c.trim()) ? <ul>{f.credits.filter((c) => c.trim()).map((c) => <li key={c}>{c}</li>)}</ul> : <p className="empty">No credits yet.</p>}
        </>}
      </section>

      {/* 2. What you do */}
      <section aria-labelledby="h-what">
        <h2 id="h-what">What you do</h2>
        {editing ? <>
          <Checks k="skills" legend="On-set skills" options={onSetSkills} form={form} toggle={toggle} err={err} />
          <Checks k="services" legend="Services you offer" options={offSetServices} form={form} toggle={toggle} err={err} />
          <Text k="other" label="Anything else you offer (optional)" form={form} set={set} err={err} described={described} />
        </> : <>
          <h3>On-set skills</h3>
          {f.skills.length ? <ul>{f.skills.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="empty">None picked yet.</p>}
          <h3>Services</h3>
          {f.services.length || f.other ? <ul>{[...f.services, f.other].filter(Boolean).map((s) => <li key={s}>{s}</li>)}</ul> : <p className="empty">None picked yet.</p>}
        </>}
      </section>

      {/* 3. Where and when */}
      <section aria-labelledby="h-where">
        <h2 id="h-where">Where and when</h2>
        {editing ? <>
          <fieldset id="f-market">
            <legend>Where you work</legend>
            <label><input type="radio" name="market" checked={form.market === "la"} onChange={() => set("market", "la")} /> Los Angeles</label>
            <label><input type="radio" name="market" checked={form.market === "other"} onChange={() => set("market", "other")} /> Another city</label>
          </fieldset>
          {form.market === "la"
            ? <Checks k="areas" legend="Los Angeles areas" options={laServiceAreas} form={form} toggle={toggle} err={err} />
            : <Text k="otherCity" label="City" form={form} set={set} err={err} described={described} />}
          <Text k="zip" label="ZIP code" hint="5 digits, like 90026" form={form} set={set} err={err} described={described} />
          <Text k="travel" label="How far you travel" form={form} set={set} err={err} described={described} />
          <fieldset id="f-monthStatus">
            <legend>This month ({form.month})</legend>
            {(Object.keys(monthStatusLabel) as (keyof typeof monthStatusLabel)[]).map((s) => (
              <label key={s}><input type="radio" name="monthStatus" checked={form.monthStatus === s} onChange={() => set("monthStatus", s)} /> {monthStatusLabel[s]}</label>
            ))}
          </fieldset>
          <Text k="dates" label="Dates or times you're free" max={DATES_MAX} form={form} set={set} err={err} described={described} />
          <Text k="earliestStart" label="Earliest start date" type="date" form={form} set={set} err={err} described={described} />
        </> : <dl>
          <dt>Area</dt><dd>{f.market === "other" ? f.otherCity || "—" : f.areas.join(", ") || "—"}{f.zip && ` (ZIP ${f.zip})`}</dd>
          <dt>Travel</dt><dd>{f.travel || "—"}</dd>
          <dt>{f.month}</dt><dd>{monthStatusLabel[f.monthStatus]}{f.dates && `: ${f.dates}`}</dd>
          {f.earliestStart && <><dt>Earliest start</dt><dd>{f.earliestStart}</dd></>}
        </dl>}
      </section>

      {/* 4. Rate */}
      <section aria-labelledby="h-rate">
        <h2 id="h-rate">Rate</h2>
        {editing ? <>
          <Text k="rate" label="Starting rate in dollars" type="number" hint="Leave blank for “Rate on request”" form={form} set={set} err={err} described={described} />
          <fieldset id="f-basis">
            <legend>Charged</legend>
            {(Object.keys(basisLabel) as (keyof typeof basisLabel)[]).map((b) => (
              <label key={b}><input type="radio" name="basis" checked={form.basis === b} onChange={() => set("basis", b)} /> {basisLabel[b]}</label>
            ))}
          </fieldset>
          <Text k="bookingMinimum" label="Minimum booking (optional)" form={form} set={set} err={err} described={described} />
        </> : <p>{hasRate(f.rate) ? `From $${f.rate} / ${basisShort[f.basis]}` : "Rate on request"}{f.bookingMinimum && ` · Minimum: ${f.bookingMinimum}`}</p>}
      </section>

      {/* 5. About */}
      <section aria-labelledby="h-about">
        <h2 id="h-about">About you</h2>
        {editing ? <>
          <div className="field" id="f-about">
            <label htmlFor="about">About you and the help you offer</label>
            <textarea id="about" rows={6} maxLength={ABOUT_MAX} value={form.about} onChange={(e) => set("about", e.target.value)} {...described("about")} />
            <p className="hint">{form.about.length} / {ABOUT_MAX} characters</p>
            {err("about")}
          </div>
          <Text k="personality" label="Something about your personality (optional)" form={form} set={set} err={err} described={described} />
          <Text k="hireableJobs" label="Jobs a client can hire you for (optional)" form={form} set={set} err={err} described={described} />
        </> : <>
          {f.about ? f.about.split("\n").map((line, i) => <p key={i}>{line}</p>) : <p className="empty">Nothing here yet.</p>}
          {f.personality && <p><strong>Personality:</strong> {f.personality}</p>}
          {f.hireableJobs && <p><strong>Hire me for:</strong> {f.hireableJobs}</p>}
        </>}
      </section>

      {/* 6. Details */}
      <section aria-labelledby="h-details">
        <h2 id="h-details">Details</h2>
        {editing ? <>
          <Text k="languages" label="Languages" form={form} set={set} err={err} described={described} />
          <fieldset id="f-mode">
            <legend>Where you work</legend>
            {(Object.keys(modeLabel) as (keyof typeof modeLabel)[]).map((m) => (
              <label key={m}><input type="radio" name="mode" checked={form.mode === m} onChange={() => set("mode", m)} /> {modeLabel[m]}</label>
            ))}
          </fieldset>
          <Text k="tools" label="Tools or equipment you bring" form={form} set={set} err={err} described={described} />
          <Text k="transport" label="Transport" form={form} set={set} err={err} described={described} />
          <fieldset id="f-insurance">
            <legend>Insurance</legend>
            {(Object.keys(insuranceLabel) as (keyof typeof insuranceLabel)[]).map((x) => (
              <label key={x}><input type="radio" name="insurance" checked={form.insurance === x} onChange={() => set("insurance", x)} /> {insuranceLabel[x]}</label>
            ))}
          </fieldset>
          <Text k="bookingMobile" label="Booking mobile (private: only the booking team sees it)" type="tel" form={form} set={set} err={err} described={described} />
        </> : <dl>
          <dt>Languages</dt><dd>{f.languages || "—"}</dd>
          <dt>Works</dt><dd>{modeLabel[f.mode]}</dd>
          <dt>Brings</dt><dd>{f.tools || "—"}</dd>
          <dt>Transport</dt><dd>{f.transport || "—"}</dd>
          <dt>Insurance</dt><dd>{insuranceLabel[f.insurance]}</dd>
        </dl>}
      </section>

      {editing && (
        <div className="actions bottom">
          <button type="button" onClick={done} disabled={busy}>Save</button>
          <button type="button" onClick={cancel} disabled={busy}>Cancel</button>
        </div>
      )}
    </main>
  );
}

type Setter = <K extends keyof ProfileFields>(k: K, v: ProfileFields[K]) => void;
type StringKey = { [K in keyof ProfileFields]-?: NonNullable<ProfileFields[K]> extends string ? K : never }[keyof ProfileFields];

function Text({ k, label, hint, type = "text", max, form, set, err, described }: {
  k: StringKey; label: string; hint?: string; type?: string; max?: number; form: ProfileFields; set: Setter;
  err: (k: keyof ProfileFields) => React.ReactNode; described: (k: keyof ProfileFields) => object;
}) {
  return (
    <div className="field" id={`f-${k}`}>
      <label htmlFor={k}>{label}</label>
      {hint && <p className="hint">{hint}</p>}
      <input id={k} type={type} maxLength={max} value={(form[k] as string | undefined) ?? ""} onChange={(e) => set(k, e.target.value as ProfileFields[typeof k])} {...described(k)} />
      {err(k)}
    </div>
  );
}

function Checks({ k, legend, options, form, toggle, err }: {
  k: "skills" | "services" | "areas"; legend: string; options: string[]; form: ProfileFields;
  toggle: (k: "skills" | "services" | "areas", v: string) => void; err: (k: keyof ProfileFields) => React.ReactNode;
}) {
  return (
    <fieldset id={`f-${k}`}>
      <legend>{legend}</legend>
      {options.map((o) => <label key={o}><input type="checkbox" checked={form[k].includes(o)} onChange={() => toggle(k, o)} /> {o}</label>)}
      {err(k)}
    </fieldset>
  );
}
