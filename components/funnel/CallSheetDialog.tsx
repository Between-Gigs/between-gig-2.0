"use client";
import { Banner, Button, Field, Input, Modal, Select, Textarea } from "@ds/components";
import { startPageTransition } from "@ds/motion";
import { Reveal } from "@ds/motion";
import { ArrowRight, Check, Inbox, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type WaitlistSignup } from "@/lib/data";
import { waitlistCategories, waitlistCategoryLabel } from "@/lib/data/taxonomy";
import { asset } from "@/lib/site";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Honeypot, trapValue } from "./Honeypot";

type Step = "signup" | "details" | "done";

const copy: Record<Step, { title: string; description: string }> = {
  signup: { title: "Get on the call sheet", description: "Get updates and an invitation when professional onboarding opens." },
  // The same words for a first sign-up and a repeat (decision N-16: the form never says who has signed up before).
  // A repeat gets no second welcome email, so neither step promises one.
  details: { title: "You're on the list.", description: "You're on the call sheet. Add optional details below, or you're all set." },
  done: { title: "Thank you for joining!", description: "You're on the call sheet. We'll email you about what comes next; if nothing arrives, check your spam folder." },
};

/**
 * The three-step "Get on the call sheet" dialog from /professionals, approved copy unchanged:
 * (1) email + ZIP → welcome email queued, (2) optional category and details, (3) thanks.
 */
export function CallSheetDialog({ open, onClose, category: initialCategory, placement }: { open: boolean; onClose: () => void; category: string; placement: string }) {
  const [step, setStep] = React.useState<Step>("signup");
  const [email, setEmail] = React.useState("");
  const [zip, setZip] = React.useState("");
  const [category, setCategory] = React.useState(initialCategory);
  const [details, setDetails] = React.useState("");
  const [errors, setErrors] = React.useState<{ email?: string; zip?: string; form?: string }>({});
  const [busy, setBusy] = React.useState(false);
  const [signup, setSignup] = React.useState<WaitlistSignup | null>(null);
  const stage = React.useRef<HTMLDivElement>(null);

  // Each opening starts fresh, with the category of the card that opened it.
  React.useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setStep("signup"); setEmail(""); setZip(""); setCategory(initialCategory); setDetails(""); setErrors({}); setSignup(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initialCategory]);

  const go = (next: Step) => startPageTransition(() => setStep(next), { effect: "shift", target: stage.current });

  const join = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const website = trapValue(e);
    const next: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter your email address, like name@example.com.";
    if (!/^\d{5}$/.test(zip)) next.zip = "Enter a 5-digit ZIP code, like 90026.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const r = await data.funnel.joinWaitlist({ email, zip, category, placement, ...(website ? { website } : {}) });
      if (!r.ok) { setErrors(r.error === "email" ? { email: "Enter your email address, like name@example.com." } : { zip: "Enter a 5-digit ZIP code, like 90026." }); return; }
      setSignup(r.signup);
      go("details");
    } catch {
      setErrors({ form: "Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const website = trapValue(e);
    if (!signup || (!category && !details.trim())) { go("done"); return; }
    setBusy(true);
    try { await data.funnel.addDetails(signup.id, { category, details, ...(website ? { website } : {}) }); go("done"); }
    catch { setErrors({ form: "Please try again." }); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={() => { if (!busy) onClose(); }} title={copy[step].title} description={copy[step].description}>
      <div ref={stage} className="vt-page">
        {errors.form && <Banner tone="danger" className="mb-4" title="We couldn't save that">{errors.form}</Banner>}
        {step === "signup" && (
          <form noValidate onSubmit={join} className="grid gap-4">
            <Honeypot />
            {category && <p className="rounded-md bg-surface-selected px-3 py-2 text-body-sm text-ink">Interested in offering: <b>{waitlistCategoryLabel(category)}</b></p>}
            <Field label="Email" error={errors.email}>
              <Input type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" value={email} start={<Mail />} autoFocus
                onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined })); }} />
            </Field>
            <Field label="ZIP code" error={errors.zip}>
              <Input inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="90026" value={zip} start={<MapPin />}
                onChange={(e) => { setZip(e.target.value.replace(/\D/g, "").slice(0, 5)); setErrors((x) => ({ ...x, zip: undefined })); }} />
            </Field>
            <p className="text-body-sm text-ink-muted">
              By joining, you agree to receive Between Gigs launch updates and accept the <Link className="text-link underline underline-offset-2" href="/terms/" target="_blank">Terms of Use</Link>.
              See our <Link className="text-link underline underline-offset-2" href="/privacy/" target="_blank">Privacy Policy</Link>. You can ask to leave at any time.
            </p>
            <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>Get on the call sheet</Button>
          </form>
        )}
        {step === "details" && (
          <form noValidate onSubmit={saveDetails} className="grid gap-4">
            <Honeypot />
            <Field label="Service category" optional>
              <Select placeholder="Choose a service" value={category || undefined} onValueChange={setCategory}
                options={waitlistCategories.filter(([value]) => value !== "styling").map(([value, label]) => ({ value, label }))} />
            </Field>
            <Field label="What would you offer?" optional>
              <Textarea rows={3} maxLength={2000} value={details} placeholder="Your services, experience or availability…" onChange={(e) => setDetails(e.target.value)} />
            </Field>
            <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>Save optional details</Button>
            <Button variant="ghost" fullWidth disabled={busy} onClick={() => go("done")}>Skip, my signup is complete</Button>
          </form>
        )}
        {step === "done" && (
          <div className="grid justify-items-center gap-5 py-2 text-center">
            {/* The Storyboard's cover as a keepsake, with the check that says it worked. */}
            <Reveal effect="pop" className="relative w-52">
              <img src={asset("art/storyboard/thumbs/front-cover.jpg")} alt="" width={800} height={533} decoding="async"
                className="aspect-3/2 h-auto w-full rotate-2 rounded-xl border-4 border-surface object-cover shadow-lg" />
              <span className="absolute -bottom-3 -left-3 grid size-12 place-items-center rounded-full bg-action text-on-action shadow-md"><Check className="size-6" aria-hidden="true" /></span>
            </Reveal>
            <div className="grid w-full gap-1 rounded-xl bg-surface-selected px-4 py-3 text-left">
              <span className="text-label-sm text-ink-brand">While you wait</span>
              <span className="text-body-sm text-ink">Flip through the Storyboard to see the kinds of work clients could bring to you.</span>
            </div>
            {data.kind === "sample" && <p className="text-body-sm text-ink-subtle">Sample mode: emails are in the <Link href="/emails/" className="inline-flex items-center gap-1 text-link underline underline-offset-2"><Inbox className="size-3.5" aria-hidden="true" />sample outbox</Link>.</p>}
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href="/storyboard/" variant="primary" iconEnd={<ArrowRight />}>Open the Storyboard</ButtonLink>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
