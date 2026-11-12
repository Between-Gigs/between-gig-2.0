"use client";
import { Button, Checkbox, Field, Input, Select } from "@ds/components";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Mail, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { professionalExamples as profiles } from "@/lib/professional-examples";
import { data } from "@/lib/data";
import { featuredPeople } from "@/lib/data/featured-people";
import { blankFields } from "@/lib/data/fields";
import { NAME_MAX } from "@/lib/profile/validate";
import { asset } from "@/lib/site";
import { JourneyFrame } from "./JourneyFrame";
import { useLook } from "@/components/site/LookSync";
import { ModernWelcome } from "@/components/auth/ModernWelcome";

type Method = "google" | "email";

/** Both account paths use the same local sample adapter as the guide. The final step is the actual on-page editor. */
export function JourneyAccount() {
  const router = useRouter();
  const modern = useLook() === "modern";
  const [id, setId] = React.useState<string>(profiles[0].id);
  const [method, setMethod] = React.useState<Method | null>(null);
  const [returning, setReturning] = React.useState(false);
  const [name, setName] = React.useState("Taylor Lane");
  const [address, setAddress] = React.useState("");
  const [accepted, setAccepted] = React.useState(false);
  const [prefill, setPrefill] = React.useState(false);
  const createdId = React.useRef("");
  const entering = React.useRef(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const sample = profiles.find((person) => person.id === id) ?? profiles[0];
  const [publicProfile, setPublicProfile] = React.useState<{ id: string; slug: string | null } | null>(null);
  React.useEffect(() => {
    let active = true;
    void data.people.get(id).then((summary) => {
      if (active) setPublicProfile({ id, slug: summary?.person.status === "approved" ? summary.person.slug : null });
    }).catch(() => { if (active) setPublicProfile({ id, slug: null }); });
    return () => { active = false; };
  }, [id]);
  const panelTitle = React.useRef<HTMLHeadingElement>(null);
  const changeMethod = (next: Method | null) => {
    if (next && !returning && !address) setAddress(`gigster-${crypto.randomUUID().slice(0, 12)}@example.test`);
    setMethod(next);
    setError("");
    requestAnimationFrame(() => panelTitle.current?.focus({ preventScroll: true }));
  };

  const enter = async () => {
    if (entering.current || !data.demo || data.kind !== "sample") return;
    if (!returning && (!name.trim() || !accepted)) {
      setError(!name.trim() ? "Enter a public name for your sample Gigster." : "Agree to the terms to create a sample account.");
      return;
    }
    entering.current = true;
    setBusy(true);
    setError("");
    try {
      if (returning) {
        const existing = await data.people.get(sample.id);
        if (!existing) throw new Error("Sample profile unavailable");
        await data.demo.signInAs("gigster", existing.person.id);
      } else {
        if (!createdId.current) {
          const result = await data.auth.register({ email: address, name: name.trim(), acceptTerms: accepted });
          if (!result.ok) throw new Error("Sample registration failed");
          createdId.current = result.person.id;
        }
        if (prefill) {
          // Copy only authored fixture data, never another user's saved fields or contact details.
          const fixture = featuredPeople.find((person) => person.id === sample.id);
          if (!fixture?.fields) throw new Error("Sample details unavailable");
          await data.profiles.saveDraft(createdId.current, { ...blankFields(), ...fixture.fields, zip: fixture.zip, name: name.trim() }, 0);
        }
      }
      router.push(`/profile/canvas/?example=${sample.id}`);
    } catch {
      setError("The sample editor couldn’t open. Please try again.");
      entering.current = false;
      setBusy(false);
    }
  };

  return (
    <JourneyFrame step="account">
      <div className={modern ? "modern-auth-stage modern-journey-stage" : "mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6 sm:py-10"}>
        <div className="journey-account-tools flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-eyebrow text-ink-muted uppercase">Alternative journey · Account preview</p>
          <label className="flex items-center gap-3 text-label-sm text-ink-muted">
            Profile example
            <Select aria-label="Profile example" size="sm" value={id} disabled={busy} onValueChange={(v) => { setId(v); setError(""); }} options={profiles.map((p) => ({ label: p.name, value: p.id }))} />
          </label>
        </div>
        <div className={modern ? "modern-auth-grid modern-journey-grid" : "grid min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:grid-cols-2"}>
          {modern && <ModernWelcome login={returning} eyebrow={returning ? "Returning Gigster" : "Gigster invitation"} />}
          <section aria-labelledby="journey-account-title" className={modern ? "modern-auth-form grid gap-5" : "order-1 grid content-center gap-5 p-5 sm:p-8 lg:order-2 lg:p-10"}>
            <div>
              <p className="text-eyebrow text-ink-brand uppercase">Stage 2 · Founding Gigsters</p>
              <h1 ref={panelTitle} tabIndex={-1} id="journey-account-title" className="mt-3 font-display text-display-sm text-balance text-ink outline-none">
                {method ? (method === "google" ? "Choose your sample account." : "Continue with your email.") : returning ? "Welcome back." : "Create your Gigster account."}
              </h1>
              <p className="mt-3 max-w-lg text-body-lg text-pretty text-ink-muted">
                {method ? `Continue as ${returning ? sample.name : name.trim() || "a new Gigster"} to edit your profile right on the page a client sees.` : returning ? "Log in to finish your profile or update your availability." : "Show people what they can hire you for, where you work, and when you’re available."}
              </p>
            </div>
            {!method ? (
              <div className="grid gap-3">
                <Button variant="primary" size="lg" fullWidth onClick={() => changeMethod("google")} iconStart={<UserRound aria-hidden="true" />}>Continue with Google</Button>
                <Button variant="secondary" size="lg" fullWidth onClick={() => changeMethod("email")} iconStart={<Mail aria-hidden="true" />}>Continue with email</Button>
                <button type="button" onClick={() => setReturning(!returning)} className="min-h-11 justify-self-start text-label-md text-ink-brand underline underline-offset-4">
                  {returning ? "New to Between Gigs? Create an account" : "Already have an account? Log in"}
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {method === "google" ? (
                  <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-sunken px-4 py-3">
                    {returning ? <img src={asset(`art/samples/cards/${sample.img}-portrait.jpg`)} alt="" className="size-11 rounded-full object-cover" />
                      : <span className="grid size-11 place-items-center rounded-full bg-surface-selected text-ink-brand"><UserRound aria-hidden="true" className="size-5" /></span>}
                    <span className="grid flex-1 text-label-md text-ink">{returning ? sample.name : name || "Your sample Gigster"}<span className="text-body-sm text-ink-muted">Sample Google account</span></span>
                    <Check aria-hidden="true" className="size-5 text-ink-brand" />
                  </div>
                ) : (
                  <Field label="Sample email address"><Input type="email" readOnly value={returning ? `${sample.id}@example.test` : address} /></Field>
                )}
                {!returning && <>
                  <Field label="Public name" hint="The name clients will see on your profile."><Input value={name} maxLength={NAME_MAX} onChange={(event) => setName(event.target.value)} /></Field>
                  <Checkbox checked={accepted} onChange={(event) => setAccepted(event.target.checked)} disabled={busy}
                    label={<>I agree to the <Link href="/terms/" target="_blank" rel="noreferrer" className="text-link underline">Terms of Use</Link> and <Link href="/privacy/" target="_blank" rel="noreferrer" className="text-link underline">Privacy Policy</Link>.</>} />
                </>}
                <Button variant="primary" size="lg" loading={busy} fullWidth onClick={() => void enter()} iconEnd={<ArrowRight aria-hidden="true" />}>{returning ? `Edit ${sample.name}’s profile` : "Create my sample profile"}</Button>
                <button type="button" disabled={busy} onClick={() => changeMethod(null)} className="inline-flex min-h-11 w-fit items-center gap-2 text-label-md text-ink-muted hover:text-ink"><ArrowLeft aria-hidden="true" className="size-4" />Choose another method</button>
                {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
              </div>
            )}
            <p className="border-t border-line pt-4 text-body-sm text-ink-muted">This walkthrough uses fictional accounts in this browser. Edit your page, then submit it for the team’s review.</p>
          </section>
          <section className={modern ? "modern-journey-example" : "order-2 grid content-start gap-5 border-t border-line bg-surface-sunken p-5 sm:p-8 lg:order-1 lg:border-t-0 lg:border-r"}>
            <h2 className="font-display text-heading-sm text-ink">A completed profile</h2>
            <div className="relative overflow-hidden rounded-xl border border-line bg-surface">
              <img src={asset(`art/samples/cards/${sample.img}-work.jpg`)} alt={sample.portfolio} className="aspect-2/1 w-full object-cover" />
              <div className="px-5 pb-5">
                <img src={asset(`art/samples/cards/${sample.img}-portrait.jpg`)} alt="" className="relative -mt-10 mb-3 size-20 rounded-full border-4 border-surface bg-surface object-cover" />
                <p className="text-eyebrow text-ink-brand uppercase">{sample.title}</p>
                <h3 className="mt-1 font-display text-heading-lg text-ink">{sample.name}</h3>
                <p className="mt-2 text-body-md text-ink">{sample.services}.</p>
                <div className="mt-3 flex items-center gap-2 text-body-sm text-ink-muted"><MapPin aria-hidden="true" className="size-4" />Los Angeles</div>
                {publicProfile?.id === id && (publicProfile.slug
                  ? <Link href={`/p/${publicProfile.slug}/`} className="mt-2 inline-flex min-h-11 items-center gap-1 text-label-md text-ink-brand underline underline-offset-4">View expanded profile<ArrowUpRight aria-hidden="true" className="size-4" /></Link>
                  : <p className="mt-3 text-body-sm text-ink-muted">The public profile opens after review.</p>)}
              </div>
            </div>
            {!returning && <Checkbox checked={prefill} onChange={(event) => setPrefill(event.target.checked)} disabled={busy}
              label="Prefill my test draft with this example" description="Leave off to start with a blank profile." />}
          </section>
        </div>
      </div>
    </JourneyFrame>
  );
}
