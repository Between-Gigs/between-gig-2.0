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
import { Icon3D } from "@/components/ui/Icon3D";
import { type Icon3DName } from "@/lib/icons3d";

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
const groups: { id: string; icon: Icon3DName; title: string; body: string; pages: { href: string; thumb: string; title: string; body: string }[] }[] = [
  { id: "journey", icon: "memo", title: "The Gigster journey", body: "The invite, signing in and the profile clients see.", pages: [
    { href: "/emails/invite/", thumb: "invite-email", title: "Invite email", body: "“Your craft. More possibilities.” and its plain-text version." },
    { href: "/login/", thumb: "login", title: "Log in", body: "Email code sign-in, for Gigsters and owners." },
    { href: "/p/maya/", thumb: "public-profile", title: "A public profile", body: "Maya Chen, approved and live." },
    { href: "/emails/", thumb: "emails", title: "Every email", body: "All the emails, and the sample outbox." },
  ] },
  { id: "public", icon: "clapper_board", title: "The public site", body: "What visitors and clients see today, and once we open.", pages: [
    { href: "/", thumb: "home", title: "Home today", body: "The Los Angeles call sheet: coming soon." },
    { href: "/professionals/", thumb: "professionals", title: "For professionals", body: "Why join, and get on the call sheet." },
    { href: "/storyboard/", thumb: "storyboard", title: "The Storyboard", body: "The interactive sketchbook and its forms." },
    { href: "/crew-call/", thumb: "crew-call", title: "Crew Call", body: "Hollywood talent at your service: the client-side call sheet." },
    { href: "/proposals/home/", thumb: "proposals", title: "Home once we open", body: "Three proposals: visitor, Gigster, owner." },
  ] },
  { id: "tools", icon: "toolbox", title: "Studio and design tools", body: "For the team: the workspace, the page designer and the effects.", pages: [
    { href: "/workspace/", thumb: "workspace", title: "Workspace", body: "Every project in one shell: switcher, ⌘K, folders, and each page inside it." },
    { href: "/studio/", thumb: "studio", title: "Studio", body: "A page designer with a CMS: tables, galleries, kanban, lists and calendars." },
    { href: "/preview/curtain/", thumb: "curtain", title: "Curtain tuner", body: "Tune the home page curtain live and copy your favourite settings." },
    { href: "/preview/cursors/", thumb: "cursors", title: "Mouse effects", body: "Try five mouse effects and pick one for the site." },
  ] },
];

type GuideView = "grid" | "list";
const VIEW_KEY = "bg2-guide-view";
/** Role tags, each with its own tint, so the role grid reads at a glance. */
const roleTint = { Owner: "bg-tint-peach", Invited: "bg-tint-butter", Gigster: "bg-tint-mint", Visitor: "bg-tint-sky" } as const;
type Role = keyof typeof roleTint;

/**
 * A guide card: a thumbnail of where it goes, a title and one line. The whole card is the link (or button),
 * and it lifts toward the pointer like the rest of the app's cards.
 */
function GuideCard({ thumb, title, body, href, onClick, tag, step, view }: { thumb: string; title: React.ReactNode; body: string; href?: string; onClick?: () => void; tag?: Role; step?: string; view: GuideView }) {
  const list = view === "list";
  const badge = tag && <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-label-sm text-tint-ink", roleTint[tag])}>{step ?? tag}</span>;
  const inner = (
    <>
      <span className={cx("relative block shrink-0 overflow-hidden rounded-lg bg-surface-sunken ring-1 ring-line", list && "w-28 sm:w-40")}>
        <img src={asset(`thumbs/${thumb}.jpg`)} alt="" width={1280} height={800} loading="lazy" decoding="async"
          className="aspect-video w-full object-cover object-top transition-transform duration-slow ease-standard group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        {badge && !list && <span className="absolute top-2 left-2">{badge}</span>}
      </span>
      <span className={cx("flex min-w-0 flex-1 items-start justify-between gap-3", !list && "px-1 pb-1")}>
        <span className="grid min-w-0 gap-1">
          {list && badge && <span>{badge}</span>}
          <span className="text-label-md text-ink">{title}</span>
          <span className="text-body-sm text-ink-muted">{body}</span>
        </span>
        <span aria-hidden="true" className={cx("grid size-8 shrink-0 place-items-center rounded-full bg-surface-selected text-ink-brand transition-transform duration-fast group-hover:translate-x-0.5", list && "self-center")}><ArrowRight className="size-4" /></span>
      </span>
    </>
  );
  const cls = list
    ? "row-lift group flex w-full items-center gap-4 rounded-xl border border-line bg-surface p-2.5 pr-4 text-left hover:bg-surface-hover"
    : "lift group grid h-full content-start gap-3 rounded-xl border border-line bg-surface p-3 text-left shadow-sm";
  const tilt = list ? undefined : "";
  return href
    ? <Link href={href} data-tilt={tilt} className={cls}>{inner}</Link>
    : <button type="button" data-tilt={tilt} onClick={onClick} className={cls}>{inner}</button>;
}

const listClass = (view: GuideView, cols = 4) => (view === "list" ? "mt-5 grid gap-2 lg:grid-cols-2" : cx("mt-5 grid gap-4 sm:grid-cols-2", cols === 3 ? "lg:grid-cols-3" : cols === 5 ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4"));

/** A section heading with a 3D icon on a tinted tile. */
function SectionHead({ id, icon, title, body, tint, children }: { id: string; icon: Icon3DName; title: string; body: string; tint: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className={cx("grid size-14 shrink-0 place-items-center rounded-xl", tint)}><Icon3D name={icon} className="size-9" /></span>
        <div>
          <h2 id={id} className="font-display text-heading-lg text-ink">{title}</h2>
          <p className="mt-0.5 max-w-2xl text-body-md text-ink-muted">{body}</p>
        </div>
      </div>
      {children}
    </div>
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

  const steps: { n: string; thumb: string; icon: Icon3DName; tint: string; title: string; body: string; action: React.ReactNode }[] = [
    { n: "Step 1", thumb: "invite-email", icon: "envelope", tint: "bg-tint-peach", title: "The invite", body: "What the 500 waitlist sign-ups receive: professional onboarding is open, with a personal link.", action: <ButtonLink href="/emails/invite/" iconEnd={<ArrowRight />}>Open the invite email</ButtonLink> },
    { n: "Step 2", thumb: "canvas", icon: "waving_hand", tint: "bg-tint-mint", title: "Join and fill in the page", body: "Create the account from the invite, fill in the profile right on the page clients will see, and send it for review.", action: <Button variant="primary" iconEnd={<ArrowRight />} onClick={startInvite}>Start as an invited Gigster</Button> },
    { n: "Step 3", thumb: "owner", icon: "clipboard", tint: "bg-tint-butter", title: "Owners review and invite", body: "Who's waiting for review, approve or suggest edits, and invite the waitlist in bulk.", action: <Button iconEnd={<ArrowRight />} onClick={startOwner}>Open the owner dashboard</Button> },
  ];

  return (
    <Page bare>
      <BrandBand eyebrow="Between Gigs 2.0 · Preview guide" title="Extraordinary talent." accent="Everyday solutions.">
        <p className="mt-4 max-w-xl text-body-lg text-ink-muted">A clickable preview of the Gigster journey, from the invite email to a profile owners can find. Everyone in it is a fictional sample, and nothing leaves your browser.</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <ul aria-label="Sample Gigsters" className="flex -space-x-3">
            {faces.map((f, i) => (
              <li key={f}><Reveal effect="fade-up" delay={i * 50}><img src={asset(`img/people/${f}.jpg`)} alt="" className="size-12 rounded-full border-2 border-surface-brand object-cover shadow-md" /></Reveal></li>
            ))}
          </ul>
          <p className="text-label-md text-ink">6 sample Gigsters<span className="block text-body-sm text-ink-muted">one at every stage of the journey</span></p>
        </div>
      </BrandBand>
      <div className="relative z-raised mx-auto -mt-12 max-w-7xl px-4 pb-20 sm:px-6">
        <ol className="grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.n}>
              <Reveal effect="fade-up" delay={i * 70} className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-lg">
                <img src={asset(`thumbs/${s.thumb}.jpg`)} alt="" width={1280} height={800} loading="lazy" decoding="async" className="aspect-video w-full rounded-xl object-cover object-top ring-1 ring-line" />
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className={cx("grid size-12 shrink-0 place-items-center rounded-xl", s.tint)}><Icon3D name={s.icon} className="size-8" /></span>
                  <div>
                    <span className="text-label-sm text-ink-brand uppercase">{s.n}</span>
                    <h2 className="font-display text-heading-lg text-ink">{s.title}</h2>
                  </div>
                </div>
                <p className="text-body-md text-ink-muted">{s.body}</p>
                <div className="mt-auto pt-1">{s.action}</div>
              </Reveal>
            </li>
          ))}
        </ol>
        {data.demo && (
          <section aria-labelledby="roles-h" className="mt-14 rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <SectionHead id="roles-h" icon="admission_tickets" tint="bg-tint-sky" title="Try every role" body="Step into the sample as anyone. No sign-in needed: it uses the fictional sample accounts, kept in this browser.">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" iconStart={<RotateCcw />} onClick={reset}>Reset sample data</Button>
                {viewSwitch}
              </div>
            </SectionHead>
            <h3 className="mt-8 text-label-md text-ink-muted">The team and the start</h3>
            <ul className={listClass(view, 3)}>
              <li><GuideCard view={view} thumb="owner" tag="Owner" title="Open as owner" body="Dashboard, review queue, people, waitlist." onClick={startOwner} /></li>
              <li><GuideCard view={view} thumb="invite" tag="Invited" title="Open the invite" body="Create the account, then fill in the profile." onClick={startInvite} /></li>
              <li><GuideCard view={view} thumb="home" tag="Visitor" title="Sign out" body="See the site as the public does." onClick={asVisitor} /></li>
            </ul>
            <h3 className="mt-8 text-label-md text-ink-muted">Gigsters, from first step to live</h3>
            <ul className={listClass(view, 3)}>
              {gigsters.map((g, i) => (
                <li key={g.id}><GuideCard view={view} thumb={g.thumb} tag="Gigster" step={`${i + 1} · ${g.stage}`} title={`Sign in as ${g.name}`} body={g.state} onClick={() => asGigster(g.id, g.go)} /></li>
              ))}
            </ul>
          </section>
        )}
        {groups.map((gr, gi) => (
          <section key={gr.id} aria-labelledby={`${gr.id}-h`} className="mt-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <SectionHead id={`${gr.id}-h`} icon={gr.icon} tint={["bg-tint-peach", "bg-tint-mint", "bg-tint-butter"][gi]} title={gr.title} body={gr.body}>
              {!data.demo && gi === 0 && viewSwitch}
            </SectionHead>
            <ul className={listClass(view, gr.pages.length)}>
              {gr.pages.map((pg) => <li key={pg.href}><GuideCard view={view} thumb={pg.thumb} title={pg.title} body={pg.body} href={pg.href} /></li>)}
            </ul>
          </section>
        ))}
        <p className="mt-6 text-body-sm text-ink-subtle">Names shown are illustrative samples for this draft.</p>
      </div>
    </Page>
  );
}
