"use client";
import { Badge, Button } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight, Mail, Search, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { data } from "@/lib/data";
import { BrandBand, Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { asset } from "@/lib/site";

const faces = ["maya", "jordan", "alex", "priya", "sam", "morgan"];

/**
 * "/" for Milestone 2: a guide to the preview for Justin and the client. The real home page is
 * Milestone 5; this one only routes people into the flows that exist.
 */
export function Overview() {
  const router = useRouter();
  const startInvite = async () => {
    const r = await data.demo?.signInAs("invited");
    router.push(`/join/?invite=${r?.inviteToken ?? ""}`);
  };
  const startOwner = async () => {
    await data.demo?.signInAs("owner");
    router.push("/owners/people/");
  };

  const steps = [
    { n: "01", icon: <Mail />, title: "The invite", body: "What the 500 waitlist sign-ups receive: professional onboarding is open, with a personal link.", action: <ButtonLink href="/emails/invite/" size="sm" iconEnd={<ArrowRight />}>Open the invite email</ButtonLink> },
    { n: "02", icon: <UserRoundPlus />, title: "Join and build a profile", body: "Register from the invite, sign in with an email code, answer the questionnaire and submit for review.", action: <Button size="sm" variant="primary" iconEnd={<ArrowRight />} onClick={startInvite}>Start as an invited Gigster</Button> },
    { n: "03", icon: <Search />, title: "Owners find everyone", body: "Search and filter every person by status, service, area and availability, then open their profile.", action: <Button size="sm" iconEnd={<ArrowRight />} onClick={startOwner}>Search as an owner</Button> },
  ];

  return (
    <Page bare>
      <BrandBand eyebrow="Between Gigs 2.0 · Milestone 2" title="Extraordinary talent." accent="Everyday solutions.">
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
                  <span className="font-mono text-data-md text-ink-subtle">{s.n}</span>
                </div>
                <h2 className="font-display text-heading-lg text-ink">{s.title}</h2>
                <p className="text-body-md text-ink-muted">{s.body}</p>
                <div className="mt-auto pt-2">{s.action}</div>
              </Reveal>
            </li>
          ))}
        </ol>
        <section aria-labelledby="more-h" className="mt-12 grid gap-4 rounded-2xl border border-line bg-surface p-6 md:grid-cols-2">
          <div>
            <h2 id="more-h" className="font-display text-heading-lg text-ink">Every screen, every state</h2>
            <p className="mt-2 text-body-md text-ink-muted">Use the <b className="text-ink">Demo</b> button in the corner to switch between a visitor, an invited Gigster, a Gigster at each status, and an owner, or to reset the sample data.</p>
          </div>
          <ul className="grid gap-2 text-body-md">
            {[["/login/", "Sign in with an email code"], ["/profile/", "My profile and its status"], ["/p/maya/", "A public profile (approved)"], ["/emails/", "All emails and the sample outbox"]].map(([href, label]) => (
              <li key={href} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0">
                <span className="text-ink">{label}</span>
                <ButtonLink href={href} size="sm" variant="ghost" iconEnd={<ArrowRight />} aria-label={`Open: ${label}`}>Open</ButtonLink>
              </li>
            ))}
          </ul>
        </section>
        <p className="mt-6 flex items-center gap-2 text-caption text-ink-subtle"><Badge tone="neutral" size="sm">Fictional sample</Badge>Names shown are illustrative samples for this draft.</p>
      </div>
    </Page>
  );
}
