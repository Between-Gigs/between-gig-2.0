"use client";
import { Button, useToast } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight, Mail, RotateCcw, Search, UserRound, UserRoundPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { data } from "@/lib/data";
import { BrandBand, Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { asset } from "@/lib/site";

const faces = ["maya", "jordan", "alex", "priya", "sam", "morgan"];

/** One sample Gigster per status, so every screen a Gigster sees is one click away. */
const gigsters = [
  { id: "grace-liu", name: "Grace", state: "Account created, profile not started", go: "/profile/" },
  { id: "elena-petrova", name: "Elena", state: "Profile in draft", go: "/profile/edit/" },
  { id: "imani-carter", name: "Imani", state: "Submitted, waiting for review", go: "/profile/" },
  { id: "hana-kim", name: "Hana", state: "Changes requested by the team", go: "/profile/" },
  { id: "maya", name: "Maya", state: "Approved and live", go: "/profile/" },
];

/**
 * "/" for Milestone 2: a guide to the preview for Justin and the client. The real home page is
 * Milestone 5; this one only routes people into the flows that exist.
 */
export function Overview() {
  const router = useRouter();
  const toast = useToast();
  const asGigster = async (id: string, go: string) => { await data.demo?.signInAs("gigster", id); router.push(go); };
  const asVisitor = async () => { await data.auth.signOut(); router.push("/"); };
  const reset = async () => { await data.demo?.reset(); toast({ message: "Sample data reset", tone: "success" }); };
  const startInvite = async () => {
    const r = await data.demo?.signInAs("invited");
    router.push(`/join/?invite=${r?.inviteToken ?? ""}`);
  };
  const startOwner = async () => {
    await data.demo?.signInAs("owner");
    router.push("/owners/");
  };

  const steps = [
    { n: "01", icon: <Mail />, title: "The invite", body: "What the 500 waitlist sign-ups receive: professional onboarding is open, with a personal link.", action: <ButtonLink href="/emails/invite/" size="sm" iconEnd={<ArrowRight />}>Open the invite email</ButtonLink> },
    { n: "02", icon: <UserRoundPlus />, title: "Join and build a profile", body: "Register from the invite, sign in with an email code, answer the questionnaire and submit for review.", action: <Button size="sm" variant="primary" iconEnd={<ArrowRight />} onClick={startInvite}>Start as an invited Gigster</Button> },
    { n: "03", icon: <Search />, title: "Owners review and invite", body: "A calm dashboard: who's waiting for review, approve or suggest edits, and invite the waitlist in bulk.", action: <Button size="sm" iconEnd={<ArrowRight />} onClick={startOwner}>Open the owner dashboard</Button> },
  ];

  return (
    <Page bare>
      <BrandBand eyebrow="Between Gigs 2.0 · Preview guide" title="Extraordinary talent." accent="Everyday solutions.">
        <p className="mt-4 max-w-xl text-body-lg text-ink-muted">A clickable preview of the Gigster journey, from the invite email to a profile owners can find. Everyone in it is a fictional sample, and nothing leaves your browser.</p>
        <ul aria-label="Sample Gigsters" className="mt-8 flex -space-x-3">
          {faces.map((f, i) => (
            <li key={f}><Reveal effect="fade-up" delay={i * 50}><img src={asset(`img/people/${f}.jpg`)} alt="" className="size-12 rounded-full border-2 border-surface-brand object-cover shadow-md" /></Reveal></li>
          ))}
        </ul>
      </BrandBand>
      <div className="relative z-raised mx-auto -mt-12 max-w-7xl px-4 pb-20 sm:px-6">
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.n}>
              <Reveal effect="fade-up" delay={i * 70} className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-full bg-surface-selected text-ink-brand [&_svg]:size-5">{s.icon}</span>
                  <span className="text-label-md text-ink-subtle tabular-nums">{s.n}</span>
                </div>
                <h2 className="font-display text-heading-lg text-ink">{s.title}</h2>
                <p className="text-body-md text-ink-muted">{s.body}</p>
                <div className="mt-auto pt-2">{s.action}</div>
              </Reveal>
            </li>
          ))}
        </ol>
        {data.demo && (
          <section aria-labelledby="roles-h" className="mt-12 rounded-2xl border border-line bg-surface p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="roles-h" className="font-display text-heading-lg text-ink">Try every role</h2>
                <p className="mt-1 max-w-2xl text-body-md text-ink-muted">Step into the sample as anyone. No sign-in needed: it uses the fictional sample accounts, kept in this browser.</p>
              </div>
              <Button size="sm" variant="ghost" iconStart={<RotateCcw />} onClick={reset}>Reset sample data</Button>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <li className="flex flex-col gap-2 rounded-xl border border-line p-4">
                <span className="text-label-md text-ink">Owner</span>
                <span className="text-body-sm text-ink-muted">Dashboard, review queue, people, waitlist</span>
                <Button size="sm" variant="primary" iconStart={<Users />} className="mt-auto self-start" onClick={startOwner}>Open as owner</Button>
              </li>
              <li className="flex flex-col gap-2 rounded-xl border border-line p-4">
                <span className="text-label-md text-ink">Invited Gigster</span>
                <span className="text-body-sm text-ink-muted">Opens the invite link: create the account and build a profile</span>
                <Button size="sm" iconStart={<UserRoundPlus />} className="mt-auto self-start" onClick={startInvite}>Open the invite</Button>
              </li>
              {gigsters.map((g) => (
                <li key={g.id} className="flex flex-col gap-2 rounded-xl border border-line p-4">
                  <span className="text-label-md text-ink">{g.name} <span className="font-normal text-ink-subtle">· Gigster</span></span>
                  <span className="text-body-sm text-ink-muted">{g.state}</span>
                  <Button size="sm" iconStart={<UserRound />} className="mt-auto self-start" onClick={() => asGigster(g.id, g.go)}>Sign in as {g.name}</Button>
                </li>
              ))}
              <li className="flex flex-col gap-2 rounded-xl border border-line p-4">
                <span className="text-label-md text-ink">Visitor</span>
                <span className="text-body-sm text-ink-muted">Signed out, as the public sees the site</span>
                <Button size="sm" variant="ghost" iconStart={<UserRound />} className="mt-auto self-start" onClick={asVisitor}>Sign out</Button>
              </li>
            </ul>
          </section>
        )}
        <section aria-labelledby="more-h" className="mt-6 grid gap-4 rounded-2xl border border-line bg-surface p-6 md:grid-cols-2">
          <div>
            <h2 id="more-h" className="font-display text-heading-lg text-ink">Every page</h2>
            <p className="mt-2 text-body-md text-ink-muted">The public pages, the sign-in, a live profile and every email.</p>
          </div>
          <ul className="grid gap-2 text-body-md">
            {[["/", "Home: the call sheet (today)"], ["/proposals/home/", "Home once we open: three proposals"], ["/professionals/", "For professionals: get on the call sheet"], ["/storyboard/", "The interactive Storyboard and its forms"], ["/login/", "Sign in"], ["/p/maya/", "A public profile (approved)"], ["/emails/", "All emails and the sample outbox"]].map(([href, label]) => (
              <li key={href} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0">
                <span className="text-ink">{label}</span>
                <ButtonLink href={href} size="sm" variant="ghost" iconEnd={<ArrowRight />} aria-label={`Open: ${label}`}>Open</ButtonLink>
              </li>
            ))}
          </ul>
        </section>
        <p className="mt-6 text-body-sm text-ink-subtle">Names shown are illustrative samples for this draft.</p>
      </div>
    </Page>
  );
}
