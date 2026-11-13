"use client";
import * as React from "react";
import Link from "next/link";
import { Banner, Button, Checkbox, Field, Input, Skeleton } from "@ds/components";
import { data } from "@/lib/data";
import { useSession } from "@/lib/session";
import { NAME_MAX } from "@/lib/profile/validate";
import { Page } from "@/components/site/Page";
import { ExperienceSwitcher } from "@/components/site/ExperienceSwitcher";

/** Admins explicitly create their own profile; no impersonation and no automatic policy acceptance. */
export function GigsterAccess({ children }: { children: React.ReactNode }) {
  const { session, loading, refresh } = useSession();
  const [name, setName] = React.useState<string | null>(null);
  const [accepted, setAccepted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  if (loading) return <Page><Skeleton shape="block" className="h-40" /></Page>;
  if (session?.role !== "owner" || session.personId) return <>{children}</>;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const fullName = name === null ? session.name.trim() : name.trim();
    if (!fullName || fullName.length > NAME_MAX) { setError("Enter your full name to continue."); return; }
    if (!accepted) { setError("Agree to the Terms of Use and Privacy Policy to create your profile."); return; }
    if (!data.auth.signUp) { setError("Profile setup is unavailable. Please try again later."); return; }
    setBusy(true); setError("");
    try {
      const result = await data.auth.signUp({ name: fullName, acceptedTerms: true });
      if (!result.ok || !result.session.personId) throw new Error("Profile setup could not be completed.");
      await refresh();
    } catch { setError("We couldn't create your profile. Your dashboard access is unchanged. Try again."); }
    finally { setBusy(false); }
  };
  return <Page>
    <div className="mx-auto grid max-w-xl gap-6 py-8">
      <ExperienceSwitcher />
      <div><p className="text-eyebrow text-ink-muted uppercase">Gigster Experience</p>
        <h1 className="mt-2 font-display text-heading-xl text-ink">Build your own Gigster profile</h1>
        <p className="mt-3 text-body-lg text-ink-muted">Use your current account to experience the same profile builder as every Gigster. Your owner access stays available.</p></div>
      <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-line bg-surface p-6">
        <p className="text-body-md text-ink-muted">Signed in as <strong className="text-ink">{session.email}</strong></p>
        {error && <Banner tone="danger" title="Profile setup">{error}</Banner>}
        <Field label="Full name" hint="The name you want clients to see.">
          <Input value={name ?? session.name} maxLength={NAME_MAX} autoComplete="name" onChange={event => setName(event.target.value)} />
        </Field>
        <Checkbox checked={accepted} onChange={event => setAccepted(event.target.checked)}
          label={<>I agree to the <Link className="underline" href="/terms/" target="_blank">Terms of Use</Link> and <Link className="underline" href="/privacy/" target="_blank">Privacy Policy</Link>.</>} />
        <Button type="submit" variant="primary" loading={busy}>Create my Gigster profile</Button>
        <p className="text-body-sm text-ink-muted">Your draft stays private until you submit it and the team approves it.</p>
      </form>
    </div>
  </Page>;
}
