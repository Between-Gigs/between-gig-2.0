"use client";
import { Button, SegmentedControl, cx, useToast } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight, LayoutGrid, List, Mail, RotateCcw, Search, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { data } from "@/lib/data";
import { BrandBand, Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { asset } from "@/lib/site";

const faces = ["maya", "jordan", "alex", "priya", "sam", "morgan"];

/** One sample Gigster per status, so every screen a Gigster sees is one click away. `thumb` is in public/thumbs. */
const gigsters = [
  { id: "grace-liu", name: "Grace", state: "Account created, profile not started", go: "/profile/", thumb: "grace" },
  { id: "ava-sinclair", name: "Ava", state: "New: a blank profile, edited in place", go: "/profile/canvas/", thumb: "canvas" },
  { id: "elena-petrova", name: "Elena", state: "Profile in draft", go: "/profile/edit/", thumb: "elena" },
  { id: "imani-carter", name: "Imani", state: "Submitted, waiting for review", go: "/profile/", thumb: "imani" },
  { id: "hana-kim", name: "Hana", state: "Changes requested by the team", go: "/profile/", thumb: "hana" },
  { id: "maya", name: "Maya", state: "Approved and live", go: "/profile/", thumb: "maya" },
];

/** Every page the guide links to, with a thumbnail of where it goes (scripts/preview-thumbs.mjs makes them). */
const pages = [
  { href: "/workspace/clients/", thumb: "clients", title: "Clients", body: "Client management: every client by stage, their projects, tasks, milestones and notes." },
  { href: "/workspace/", thumb: "workspace", title: "Workspace", body: "Every project in one shell: switcher, ⌘K, folders, and each page live inside it." },
  { href: "/", thumb: "home", title: "Home today", body: "The Los Angeles call sheet: coming soon." },
  { href: "/proposals/home/", thumb: "proposals", title: "Home once we open", body: "Three proposals: visitor, Gigster, owner." },
  { href: "/crew-call/", thumb: "crew-call", title: "Crew Call", body: "Hollywood talent at your service: the client-side call sheet (V15)." },
  { href: "/professionals/", thumb: "professionals", title: "For professionals", body: "Why join, and get on the call sheet." },
  { href: "/storyboard/", thumb: "storyboard", title: "The Storyboard", body: "The interactive sketchbook and its forms." },
  { href: "/login/", thumb: "login", title: "Sign in", body: "Email code sign-in." },
  { href: "/p/maya/", thumb: "public-profile", title: "A public profile", body: "Maya Chen, approved and live." },
  { href: "/emails/", thumb: "emails", title: "Emails", body: "Every email, and the sample outbox." },
  { href: "/preview/cursors/", thumb: "cursors", title: "Mouse effects", body: "Try five mouse effects and pick one for the site." },
  { href: "/preview/curtain/", thumb: "home", title: "Curtain tuner", body: "Tune the home page curtain live and copy your favourite settings." },
  { href: "/studio/", thumb: "studio", title: "Studio", body: "A Webflow-style page designer with a CMS: tables, galleries, kanban, lists and calendars." },
];

/**
 * A guide card: a thumbnail of where it goes, a title and one line. The whole card is the link (or button),
 * and it lifts toward the pointer like the rest of the app's cards.
 */
type GuideView = "grid" | "list";
const VIEW_KEY = "bg2-guide-view";

function GuideCard({ thumb, title, body, href, onClick, tag, view }: { thumb: string; title: React.ReactNode; body: string; href?: string; onClick?: () => void; tag?: string; view: GuideView }) {
  const list = view === "list";
  const inner = (
    <>
      <span className={cx("relative block shrink-0 overflow-hidden rounded-md border border-line bg-surface-sunken", list && "w-28 sm:w-40")}>
        <img src={asset(`thumbs/${thumb}.jpg`)} alt="" width={640} height={400} loading="lazy" decoding="async"
          className="aspect-video w-full object-cover object-top transition-transform duration-slow ease-standard group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        {tag && !list && <span className="absolute top-2 left-2 rounded-full bg-surface/85 px-2 py-0.5 text-label-sm text-ink backdrop-blur-sm">{tag}</span>}
      </span>
      <span className={cx("flex min-w-0 flex-1 items-start justify-between gap-3", !list && "px-1")}>
        <span className="grid min-w-0 gap-0.5">
          {tag && list && <span className="text-label-sm text-ink-brand">{tag}</span>}
          <span className="text-label-md text-ink">{title}</span>
          <span className="text-body-sm text-ink-muted">{body}</span>
        </span>
        <ArrowRight className={cx("size-4 shrink-0 text-ink-subtle transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-ink-brand", list ? "self-center" : "mt-0.5")} aria-hidden="true" />
      </span>
    </>
  );
  const cls = list
    ? "row-lift group flex w-full items-center gap-4 rounded-lg border border-line bg-surface p-2.5 pr-4 text-left hover:bg-surface-hover"
    : "lift group grid h-full content-start gap-3 rounded-lg border border-line bg-surface p-3 text-left";
  const tilt = list ? undefined : "";
  return href
    ? <Link href={href} data-tilt={tilt} className={cls}>{inner}</Link>
    : <button type="button" data-tilt={tilt} onClick={onClick} className={cls}>{inner}</button>;
}

/** The two guide lists share one layout: thumbnails in a grid, or rows you can scan top to bottom. */
const listClass = (view: GuideView) => (view === "list" ? "mt-5 grid gap-2 lg:grid-cols-2" : "mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4");

/**
 * "/" for Milestone 2: a guide to the preview for Justin and the client. The real home page is
 * Milestone 5; this one only routes people into the flows that exist.
 */
export function Overview() {
  const router = useRouter();
  const [view, setView] = React.useState<GuideView>("grid");
  React.useEffect(() => {
    try { const v = localStorage.getItem(VIEW_KEY); if (v === "grid" || v === "list") setView(v); } catch { /* ignore */ } // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  const changeView = (v: string) => { setView(v as GuideView); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } };
  const viewSwitch = (
    <SegmentedControl label="View" size="sm" value={view} onChange={changeView}
      options={[{ value: "grid", label: "Grid", icon: <LayoutGrid /> }, { value: "list", label: "List", icon: <List /> }]} />
  );
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
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" iconStart={<RotateCcw />} onClick={reset}>Reset sample data</Button>
                {viewSwitch}
              </div>
            </div>
            <ul className={listClass(view)}>
              <li><GuideCard view={view} thumb="owner" tag="Owner" title="Open as owner" body="Dashboard, review queue, people, waitlist." onClick={startOwner} /></li>
              <li><GuideCard view={view} thumb="invite" tag="Invited" title="Open the invite" body="Create the account, then build a profile." onClick={startInvite} /></li>
              {gigsters.map((g) => (
                <li key={g.id}><GuideCard view={view} thumb={g.thumb} tag="Gigster" title={`Sign in as ${g.name}`} body={g.state} onClick={() => asGigster(g.id, g.go)} /></li>
              ))}
              <li><GuideCard view={view} thumb="home" tag="Visitor" title="Sign out" body="See the site as the public does." onClick={asVisitor} /></li>
            </ul>
          </section>
        )}
        <section aria-labelledby="more-h" className="mt-6 rounded-2xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="more-h" className="font-display text-heading-lg text-ink">Every page</h2>
              <p className="mt-1 text-body-md text-ink-muted">The public pages, sign-in, a live profile and every email. Pick one to open it.</p>
            </div>
            {!data.demo && viewSwitch}
          </div>
          <ul className={listClass(view)}>
            {pages.map((pg) => <li key={pg.href}><GuideCard view={view} thumb={pg.thumb} title={pg.title} body={pg.body} href={pg.href} /></li>)}
          </ul>
        </section>
        <p className="mt-6 text-body-sm text-ink-subtle">Names shown are illustrative samples for this draft.</p>
      </div>
    </Page>
  );
}
