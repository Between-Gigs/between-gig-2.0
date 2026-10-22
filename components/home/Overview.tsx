"use client";
import { Button, useToast } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight, Mail, RotateCcw, Search, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { data } from "@/lib/data";
import { BrandBand, Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { asset } from "@/lib/site";

const faces = ["maya", "jordan", "alex", "priya", "sam", "morgan"];

/** One sample Gigster per status, so every screen a Gigster sees is one click away. `thumb` is in public/thumbs. */
const gigsters = [
  { id: "grace-liu", name: "Grace", state: "Account created, profile not started", go: "/profile/", thumb: "grace" },
  { id: "elena-petrova", name: "Elena", state: "Profile in draft", go: "/profile/edit/", thumb: "elena" },
  { id: "imani-carter", name: "Imani", state: "Submitted, waiting for review", go: "/profile/", thumb: "imani" },
  { id: "hana-kim", name: "Hana", state: "Changes requested by the team", go: "/profile/", thumb: "hana" },
  { id: "maya", name: "Maya", state: "Approved and live", go: "/profile/", thumb: "maya" },
];

/** Every page the guide links to, with a thumbnail of where it goes (scripts/preview-thumbs.mjs makes them). */
const pages = [
  { href: "/", thumb: "home", title: "Home today", body: "The Los Angeles call sheet: coming soon." },
  { href: "/proposals/home/", thumb: "proposals", title: "Home once we open", body: "Three proposals: visitor, Gigster, owner." },
  { href: "/professionals/", thumb: "professionals", title: "For professionals", body: "Why join, and get on the call sheet." },
  { href: "/storyboard/", thumb: "storyboard", title: "The Storyboard", body: "The interactive sketchbook and its forms." },
  { href: "/login/", thumb: "login", title: "Sign in", body: "Email code sign-in." },
  { href: "/p/maya/", thumb: "public-profile", title: "A public profile", body: "Maya Chen, approved and live." },
  { href: "/emails/", thumb: "emails", title: "Emails", body: "Every email, and the sample outbox." },
];

/**
 * A guide card: a thumbnail of where it goes, a title and one line. The whole card is the link (or button),
 * and it lifts toward the pointer like the rest of the app's cards.
 */
function GuideCard({ thumb, title, body, href, onClick, tag }: { thumb: string; title: React.ReactNode; body: string; href?: string; onClick?: () => void; tag?: string }) {
  const inner = (
    <>
      <span className="relative block overflow-hidden rounded-md border border-line bg-surface-sunken">
        <img src={asset(`thumbs/${thumb}.jpg`)} alt="" width={640} height={400} loading="lazy" decoding="async"
          className="aspect-video w-full object-cover object-top transition-transform duration-slow ease-standard group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        {tag && <span className="absolute top-2 left-2 rounded-full bg-surface/85 px-2 py-0.5 text-label-sm text-ink backdrop-blur-sm">{tag}</span>}
      </span>
      <span className="flex items-start justify-between gap-3 px-1">
        <span className="grid gap-0.5">
          <span className="text-label-md text-ink">{title}</span>
          <span className="text-body-sm text-ink-muted">{body}</span>
        </span>
        <ArrowRight className="mt-0.5 size-4 shrink-0 text-ink-subtle transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-ink-brand" aria-hidden="true" />
      </span>
    </>
  );
  const cls = "lift group grid h-full content-start gap-3 rounded-lg border border-line bg-surface p-3 text-left";
  return href
    ? <Link href={href} data-tilt="" className={cls}>{inner}</Link>
    : <button type="button" data-tilt="" onClick={onClick} className={cls}>{inner}</button>;
}

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
    { n: "01", thumb: "invite-email", icon: <Mail />, title: "The invite", body: "What the 500 waitlist sign-ups receive: professional onboarding is open, with a personal link.", action: <ButtonLink href="/emails/invite/" size="sm" iconEnd={<ArrowRight />}>Open the invite email</ButtonLink> },
    { n: "02", thumb: "invite", icon: <UserRoundPlus />, title: "Join and build a profile", body: "Register from the invite, sign in with an email code, answer the questionnaire and submit for review.", action: <Button size="sm" variant="primary" iconEnd={<ArrowRight />} onClick={startInvite}>Start as an invited Gigster</Button> },
    { n: "03", thumb: "owner", icon: <Search />, title: "Owners review and invite", body: "A calm dashboard: who's waiting for review, approve or suggest edits, and invite the waitlist in bulk.", action: <Button size="sm" iconEnd={<ArrowRight />} onClick={startOwner}>Open the owner dashboard</Button> },
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
                <img src={asset(`thumbs/${s.thumb}.jpg`)} alt="" width={640} height={400} loading="lazy" decoding="async" className="-mx-2 -mt-2 aspect-video w-auto rounded-lg border border-line object-cover object-top" />
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
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <li><GuideCard thumb="owner" tag="Owner" title="Open as owner" body="Dashboard, review queue, people, waitlist." onClick={startOwner} /></li>
              <li><GuideCard thumb="invite" tag="Invited" title="Open the invite" body="Create the account, then build a profile." onClick={startInvite} /></li>
              {gigsters.map((g) => (
                <li key={g.id}><GuideCard thumb={g.thumb} tag="Gigster" title={`Sign in as ${g.name}`} body={g.state} onClick={() => asGigster(g.id, g.go)} /></li>
              ))}
              <li><GuideCard thumb="home" tag="Visitor" title="Sign out" body="See the site as the public does." onClick={asVisitor} /></li>
            </ul>
          </section>
        )}
        <section aria-labelledby="more-h" className="mt-6 rounded-2xl border border-line bg-surface p-6">
          <h2 id="more-h" className="font-display text-heading-lg text-ink">Every page</h2>
          <p className="mt-1 text-body-md text-ink-muted">The public pages, sign-in, a live profile and every email. Pick one to open it.</p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pages.map((pg) => <li key={pg.href}><GuideCard thumb={pg.thumb} title={pg.title} body={pg.body} href={pg.href} /></li>)}
          </ul>
        </section>
        <p className="mt-6 text-body-sm text-ink-subtle">Names shown are illustrative samples for this draft.</p>
      </div>
    </Page>
  );
}
