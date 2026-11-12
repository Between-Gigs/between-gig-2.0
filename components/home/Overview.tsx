"use client";
import { Button, SegmentedControl, cx, useToast } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight, LayoutGrid, List, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { data } from "@/lib/data";
import { BrandBand, Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { asset } from "@/lib/site";

const faces = ["maya", "jordan", "alex", "priya", "sam", "morgan"];

/** One sample Gigster per stage, in journey order, so every screen a Gigster sees is one click away. `thumb` is in public/thumbs. */
const gigsters = [
  { id: "grace-liu", name: "Grace", stage: "Not started", state: "Account created, profile not started", go: "/profile/", thumb: "grace" },
  { id: "ava-sinclair", name: "Ava", stage: "Blank page", state: "A blank profile, filled in on the page", go: "/profile/canvas/", thumb: "canvas" },
  { id: "elena-petrova", name: "Elena", stage: "Draft", state: "Half done, editing on the page", go: "/profile/canvas/", thumb: "elena" },
  { id: "imani-carter", name: "Imani", stage: "Submitted", state: "Waiting for the team's review", go: "/profile/", thumb: "imani" },
  { id: "hana-kim", name: "Hana", stage: "Changes", state: "The team asked for a few changes", go: "/profile/", thumb: "hana" },
  { id: "maya", name: "Maya", stage: "Live", state: "Approved and live", go: "/profile/", thumb: "maya" },
];

/** Every page the guide links to, grouped, with a thumbnail of where it goes (scripts/preview-thumbs.mjs makes them). */
const groups: { id: string; title: string; body: string; pages: { href: string; thumb: string; title: string; body: string }[] }[] = [
  { id: "journey", title: "The Gigster journey", body: "The invite, signing in and the profile clients see.", pages: [
    { href: "/emails/invite/", thumb: "invite-email", title: "Invite email", body: "“Your craft. More possibilities.” and its plain-text version." },
    { href: "/login/", thumb: "login", title: "Log in", body: "Email code sign-in, for Gigsters and owners." },
    { href: "/p/maya/", thumb: "public-profile", title: "A public profile", body: "Maya Chen, approved and live." },
    { href: "/emails/", thumb: "emails", title: "Every email", body: "All the emails, and the sample outbox." },
  ] },
  { id: "public", title: "The public site", body: "What visitors and clients see today, and once we open.", pages: [
    { href: "/", thumb: "home", title: "Home today", body: "The Los Angeles call sheet: coming soon." },
    { href: "/professionals/", thumb: "professionals", title: "For professionals", body: "Why join, and get on the call sheet." },
    { href: "/storyboard/", thumb: "storyboard", title: "The Storyboard", body: "The interactive sketchbook and its forms." },
    { href: "/crew-call/", thumb: "crew-call", title: "Crew Call", body: "Hollywood talent at your service: the client-side call sheet." },
    { href: "/proposals/home/", thumb: "proposals", title: "Home once we open", body: "Three proposals: visitor, Gigster, owner." },
  ] },
  { id: "tools", title: "Studio and design tools", body: "For the team: the workspace, the page designer and the effects.", pages: [
    { href: "/workspace/", thumb: "workspace", title: "Workspace", body: "Every project in one shell: switcher, ⌘K, folders, and each page inside it." },
    { href: "/studio/", thumb: "studio", title: "Studio", body: "A page designer with a CMS: tables, galleries, kanban, lists and calendars." },
    { href: "/preview/curtain/", thumb: "curtain", title: "Curtain tuner", body: "Tune the home page curtain live and copy your favourite settings." },
    { href: "/preview/cursors/", thumb: "cursors", title: "Mouse effects", body: "Try five mouse effects and pick one for the site." },
  ] },
];

type GuideView = "grid" | "list";
/** The one mint block's button: forest on mint, in both themes. */
const onMint = "justify-between! gap-6! bg-forest-950! text-white! hover:bg-forest-800!";
const VIEW_KEY = "bg2-guide-view";
/** Role tags: small uppercase labels, so the role grid reads at a glance. */
type Role = "Owner" | "Invited" | "Gigster" | "Visitor";

/**
 * A guide card (Swiss): a thick rule, a hard-cropped thumbnail of where it goes, a title and one line. The whole card is
 * the link (or button).
 */
function GuideCard({ thumb, title, body, href, onClick, tag, step, view }: { thumb: string; title: React.ReactNode; body: string; href?: string; onClick?: () => void; tag?: Role; step?: string; view: GuideView }) {
  const list = view === "list";
  const badge = tag && <span className="inline-flex bg-bg px-2 py-1 text-eyebrow text-ink uppercase">{step ?? tag}</span>;
  const inner = (
    <>
      <span className={cx("relative block shrink-0 overflow-hidden rounded-lg bg-surface-sunken", list && "w-28 sm:w-40")}>
        <img src={asset(`thumbs/${thumb}.jpg`)} alt="" width={1280} height={800} loading="lazy" decoding="async"
          className="aspect-video w-full object-cover object-top transition-transform duration-slow ease-standard group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        {badge && !list && <span className="absolute top-0 left-0">{badge}</span>}
      </span>
      <span className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <span className="grid min-w-0 gap-1">
          {list && tag && <span className="text-eyebrow text-ink-muted uppercase">{step ?? tag}</span>}
          <span className="font-display text-heading-md text-ink decoration-2 underline-offset-4 group-hover:underline">{title}</span>
          <span className="text-body-sm text-ink-muted">{body}</span>
        </span>
        <ArrowRight aria-hidden="true" className={cx("mt-1 size-5 shrink-0 text-ink transition-transform duration-fast group-hover:translate-x-0.5", list && "self-center")} />
      </span>
    </>
  );
  const cls = list
    ? "row-lift group flex w-full items-center gap-4 border-t border-line py-3 text-left hover:bg-surface-hover"
    : "group grid h-full w-full content-start gap-3 rounded-xl border border-line bg-surface-raised p-4 text-left shadow-sm swiss:border-0 swiss:border-t-4 swiss:border-line-strong swiss:bg-transparent swiss:p-0 swiss:pt-3";
  return href
    ? <Link href={href} className={cls}>{inner}</Link>
    : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

const listClass = (view: GuideView, cols = 4) => (view === "list" ? "grid gap-x-6 lg:grid-cols-2" : cx("grid gap-x-6 gap-y-8 sm:grid-cols-2", cols === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"));

/** A numbered Swiss section: the label column (number, heading, one line, any controls) on the left, content on the right. */
function Section({ n, id, title, body, aside, children }: { n: string; id: string; title: string; body: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-16 grid gap-x-6 gap-y-6 border-t-4 border-line-strong pt-4 lg:mt-20 lg:grid-cols-12">
      <div className="grid content-start gap-3 lg:col-span-3">
        <h2 id={id} className="grid gap-2 font-display text-heading-lg text-ink"><span className="text-label-sm tabular-nums">{n}</span>{title}</h2>
        <p className="max-w-md text-body-md text-ink-muted">{body}</p>
        {aside}
      </div>
      <div className="min-w-0 lg:col-span-9">{children}</div>
    </section>
  );
}

/**
 * /preview/: the guide to the preview for Justin and the client. It routes people into every flow that exists:
 * the three journeys, every role in the sample, and every page, grouped.
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

  const steps: { n: string; thumb: string; title: string; body: string; action: React.ReactNode }[] = [
    { n: "Step 1", thumb: "invite-email", title: "The invite", body: "What the 500 waitlist sign-ups receive: professional onboarding is open, with a personal link.", action: <ButtonLink href="/emails/invite/" iconEnd={<ArrowRight />}>Open the invite email</ButtonLink> },
    { n: "Step 2", thumb: "canvas", title: "Join and fill in the page", body: "Create the account from the invite, fill in the profile right on the page clients will see, and send it for review.", action: <Button variant="primary" size="lg" iconEnd={<ArrowRight />} onClick={startInvite} className={onMint}>Start as an invited Gigster</Button> },
    { n: "Step 3", thumb: "owner", title: "Owners review and invite", body: "Who's waiting for review, approve or suggest edits, and invite the waitlist in bulk.", action: <Button iconEnd={<ArrowRight />} onClick={startOwner}>Open the owner dashboard</Button> },
  ];

  return (
    <Page bare>
      <BrandBand eyebrow="Between Gigs 2.0 · Preview guide" title="Extraordinary talent." accent="Everyday solutions.">
        <p className="mt-4 max-w-xl text-body-lg text-ink-muted">A clickable preview of the Gigster journey, from the invite email to a profile owners can find. Everyone in it is a fictional sample, and nothing leaves your browser.</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <ul aria-label="Sample Gigsters" className="flex">
            {faces.map((f, i) => (
              <li key={f}><Reveal effect="fade-up" delay={i * 50}><img src={asset(`img/people/${f}.jpg`)} alt="" className="size-12 rounded-full border-2 border-surface-brand object-cover" /></Reveal></li>
            ))}
          </ul>
          <p className="text-label-md text-ink">6 sample Gigsters<span className="block text-body-sm text-ink-muted">one at every stage of the journey</span></p>
        </div>
      </BrandBand>
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <Section n="01" id="journey-steps-h" title="Start here" body="The whole Gigster journey in three steps, from the invite to the owner's review.">
          <ol className="grid gap-x-6 gap-y-8 md:grid-cols-3">
            {steps.map((s, i) => {
              const now = i === 1;
              return (
                <li key={s.n}>
                  <Reveal effect="fade-up" delay={i * 70} className={cx("flex h-full flex-col gap-4 rounded-xl border border-line bg-surface-raised p-5 swiss:border-0 swiss:border-t-4 swiss:bg-transparent swiss:p-0", now ? "border-tint-mint bg-tint-mint! p-5! text-forest-950" : "swiss:border-line-strong swiss:pt-4 text-ink")}>
                    <img src={asset(`thumbs/${s.thumb}.jpg`)} alt="" width={1280} height={800} loading="lazy" decoding="async" className="aspect-video w-full object-cover object-top" />
                    <div className="flex items-start gap-4">
                      <span aria-hidden="true" className="font-display text-stat tabular-nums">{i + 1}</span>
                      <div className="grid gap-1 pt-1">
                        <span className="text-eyebrow uppercase">{now ? `${s.n} · Start here` : s.n}</span>
                        <h3 className="font-display text-heading-md">{s.title}</h3>
                      </div>
                    </div>
                    <p className={cx("text-body-md", now ? "text-forest-950" : "text-ink-muted")}>{s.body}</p>
                    <div className="mt-auto pt-1">{s.action}</div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </Section>
        {data.demo && (
          <Section n="02" id="roles-h" title="Try every role" body="Step into the sample as anyone. No sign-in needed: it uses the fictional sample accounts, kept in this browser."
            aside={<div className="flex flex-wrap items-center gap-2 pt-2">{viewSwitch}<Button size="sm" variant="ghost" iconStart={<RotateCcw />} onClick={reset}>Reset sample data</Button></div>}>
            <h3 className="text-eyebrow text-ink-muted uppercase">Team and start</h3>
            <ul className={cx("mt-4", listClass(view, 3))}>
              <li><GuideCard view={view} thumb="owner" tag="Owner" title="Open as owner" body="Dashboard, review queue, people, waitlist." onClick={startOwner} /></li>
              <li><GuideCard view={view} thumb="invite" tag="Invited" title="Open the invite" body="Create the account, then fill in the profile." onClick={startInvite} /></li>
              <li><GuideCard view={view} thumb="home" tag="Visitor" title="Sign out" body="See the site as the public does." onClick={asVisitor} /></li>
            </ul>
            <h3 className="mt-12 text-eyebrow text-ink-muted uppercase">Gigsters, start to live</h3>
            <ul className={cx("mt-4", listClass(view, 3))}>
              {gigsters.map((g, i) => (
                <li key={g.id}><GuideCard view={view} thumb={g.thumb} tag="Gigster" step={`${i + 1} · ${g.stage}`} title={`Sign in as ${g.name}`} body={g.state} onClick={() => asGigster(g.id, g.go)} /></li>
              ))}
            </ul>
          </Section>
        )}
        {groups.map((gr, gi) => (
          <Section key={gr.id} n={String(gi + (data.demo ? 3 : 2)).padStart(2, "0")} id={`${gr.id}-h`} title={gr.title} body={gr.body}
            aside={!data.demo && gi === 0 ? <div className="pt-2">{viewSwitch}</div> : undefined}>
            <ul className={listClass(view, gr.pages.length)}>
              {gr.pages.map((pg) => <li key={pg.href}><GuideCard view={view} thumb={pg.thumb} title={pg.title} body={pg.body} href={pg.href} /></li>)}
            </ul>
          </Section>
        ))}
        <p className="mt-16 border-t border-line pt-4 text-body-sm text-ink-muted">Names shown are illustrative samples for this draft.</p>
      </div>
    </Page>
  );
}
