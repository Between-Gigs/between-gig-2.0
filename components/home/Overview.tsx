"use client";
import { Button, SegmentedControl, cx, useToast } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight, LayoutGrid, List, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { data } from "@/lib/data";
import { professionalExamples as profiles } from "@/lib/professional-examples";
import { BrandBand, Page } from "@/components/site/Page";
import { ThemeBadge } from "@/components/site/ThemeBadge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { DEMO_TOKENS } from "@/lib/data/fields";
import { DesignSystemBlock } from "./DesignSystemBlock";
import { GuidePreviews, LivePagePreview } from "./LivePagePreview";
import { useLook } from "@/components/site/LookSync";
import { Icon3D } from "@/components/ui/Icon3D";
import type { Icon3DName } from "@/lib/icons3d";
import { asset, basePath } from "@/lib/site";

const invitePage = `/join/?invite=${DEMO_TOKENS.valid}`;

/** One sample Gigster per stage, in journey order, so every screen a Gigster sees is one click away. */
const gigsters = [
  { id: "grace-liu", name: "Grace", stage: "Not started", state: "Account created, profile not started", go: "/profile/" },
  { id: "ava-sinclair", name: "Ava", stage: "Blank page", state: "A blank profile, filled in on the page", go: "/profile/canvas/" },
  { id: "elena-petrova", name: "Elena", stage: "Draft", state: "Half done, editing on the page", go: "/profile/canvas/" },
  { id: "imani-carter", name: "Imani", stage: "Submitted", state: "Waiting for the team's review", go: "/profile/" },
  { id: "hana-kim", name: "Hana", stage: "Changes", state: "The team asked for a few changes", go: "/profile/" },
  { id: "maya", name: "Maya", stage: "Live", state: "Approved and live", go: "/profile/" },
];

/** Every linked page is also its own live preview. */
type SectionArt = { icon: Icon3DName; tint: string };
const groups: { id: string; art: SectionArt; title: string; body: string; pages: { href: string; title: string; body: string }[] }[] = [
  { id: "journey", art: { icon: "memo", tint: "bg-tint-peach" }, title: "The Gigster journey", body: "The invite, signing in and the profile clients see.", pages: [
    { href: "/preview/gigster-journey/", title: "Stage 2 invitation journey", body: "Try the revised invitation, account setup, profile edit and review handoff." },
    { href: "/emails/invite/", title: "Invite email", body: "“Your craft. More possibilities.” and its plain-text version." },
    { href: "/join/", title: "Sign up", body: "“Bring your craft beyond the set.” Create an account in one step." },
    { href: "/login/", title: "Log in", body: "Email code sign-in, for Gigsters and owners." },
    { href: "/profile/canvas/", title: "Edit your profile", body: "How I can help first, what's required to submit, then Preview and Submit for review." },
    { href: "/profile/submitted/", title: "Profile submitted", body: "In review: what happens next, and your profile stays private." },
    { href: "/emails/", title: "Every email", body: "All the emails, and the sample outbox." },
  ] },
  { id: "public", art: { icon: "clapper_board", tint: "bg-tint-mint-soft" }, title: "The public site", body: "What visitors and clients see today, and once we open.", pages: [
    { href: basePath === "/hub" ? "/home/" : "/", title: "Coming soon", body: "The Los Angeles Call Sheet, and one button to create your Gigster profile." },
    { href: "/professionals/", title: "For professionals", body: "Why join, with every button going straight to sign-up." },
    { href: "/storyboard/", title: "The Storyboard", body: "The interactive sketchbook and its forms." },
    { href: "/crew-call/", title: "Crew Call", body: "Hollywood talent at your service: the client-side call sheet." },
    { href: "/proposals/home/", title: "Home once we open", body: "Three proposals: visitor, Gigster, owner." },
  ] },
  { id: "tools", art: { icon: "toolbox", tint: "bg-tint-butter" }, title: "Studio and design tools", body: "For the team: the workspace, the page designer and the effects.", pages: [
    { href: "/preview/design-system/", title: "Design system", body: "Every theme side by side, Styled or Unstyled, and each atom, molecule, organism and template live." },
    { href: "/preview/profile-editor/", title: "Gigster profile editor", body: "Choose required fields, arrange the form and adjust the profile page." },
    { href: "/preview/wallpapers/", title: "Wallpapers & background art", body: "Download the invitation artwork and Call Sheet backgrounds." },
    { href: "/preview/footers/", title: "Footer photos", body: "Four photo bands for the footer, on the real footer, to pick one." },
    { href: "/workspace/", title: "Workspace", body: "Every project in one shell: switcher, ⌘K, folders, and each page inside it." },
    { href: "/owners/staff/", title: "Staff & access", body: "Manage invitations, multiple roles and access rules in the sample dashboard." },
    { href: "/studio/", title: "Studio", body: "A page designer with a CMS: tables, galleries, kanban, lists and calendars." },
    { href: "/preview/curtain/", title: "Curtain tuner", body: "Tune the home page curtain live and copy your favourite settings." },
    { href: "/preview/cursors/", title: "Mouse effects", body: "Try five mouse effects and pick one for the site." },
  ] },
  { id: "drafts", art: { icon: "framed_picture", tint: "bg-tint-sky" }, title: "Previous designs", body: "The pages as they were before the Green Room launch, kept for comparison. Nothing here is live.", pages: [
    { href: "/preview/drafts/coming-soon-v1/", title: "Coming soon · v1", body: "The call-sheet home with its two-step form." },
    { href: "/preview/drafts/professionals-v1/", title: "For professionals · v1", body: "The earlier long page and its call-sheet form." },
    { href: "/preview/drafts/join-v1/", title: "Sign up · v1", body: "The previous create-account layout." },
    { href: "/preview/drafts/login-v1/", title: "Log in · v1", body: "The previous log-in layout." },
    { href: "/preview/drafts/profile-editor-v1/", title: "Profile editor · v1", body: "The edit-on-page profile editor before the rebuild." },
  ] },
];

type GuideView = "grid" | "list";
/** The one mint block's button: forest on mint, in both themes. */
const onMint = "justify-between! gap-6! bg-forest-950! text-white! hover:bg-forest-800!";
const shortcut = "inline-flex min-h-11 items-center rounded-md text-label-md text-ink underline decoration-line-strong underline-offset-4 hover:text-ink-brand";
const VIEW_KEY = "bg2-guide-view";
/** Role tags: small uppercase labels, so the role grid reads at a glance. */
const roleTint = { Owner: "bg-tint-peach", Invited: "bg-tint-butter", Gigster: "bg-tint-mint-soft", Visitor: "bg-tint-sky" } as const;
type Role = keyof typeof roleTint;

/** The control covers the card. Its inert preview is a sibling, outside the link or button. */
function GuideCard({ title, body, href, as, onClick, tag, step, view }: {
  title: string; body: string; href: string; as?: string; onClick?: () => void; tag?: Role; step?: string; view: GuideView;
}) {
  const cards = useLook() !== "swiss";
  const list = view === "list";
  const badge = tag && <span className={cards ? cx("inline-flex rounded-full px-2.5 py-0.5 text-label-sm text-tint-ink", roleTint[tag]) : "inline-flex bg-bg px-2 py-1 text-eyebrow text-ink uppercase"}>{step ?? tag}</span>;
  const label = (
    <>
      <span className="grid min-w-0 flex-1 gap-1">
        {list && badge && <span>{badge}</span>}
        <span className={cards ? "text-label-md text-ink" : "font-display text-heading-md text-ink decoration-2 underline-offset-4 group-hover:underline"}>{title}</span>
        <span className="text-body-sm text-ink-muted">{body}</span>
      </span>
      <ArrowRight aria-hidden="true" className={cx("mt-1 size-5 shrink-0 text-ink transition-transform duration-fast group-hover:translate-x-0.5", list && "self-center")} />
    </>
  );
  const cls = list
    ? "row-lift group flex w-full items-center gap-4 border-t border-line py-3 text-left hover:bg-surface-hover card-layout:rounded-xl card-layout:border card-layout:bg-surface card-layout:p-2.5 card-layout:pr-4"
    : "group grid h-full w-full content-start gap-3 rounded-xl border border-line bg-surface-raised p-4 text-left shadow-sm card-layout:bg-surface card-layout:p-3 swiss:border-0 swiss:border-t-4 swiss:border-line-strong swiss:bg-transparent swiss:p-0 swiss:pt-3";
  const action = "flex min-w-0 flex-1 items-start justify-between gap-3 text-left after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-focus";
  return (
    <div className={cx("relative", cls)}>
      <span className={cx("relative block min-w-0 shrink-0", list && "w-28 sm:w-40")}>
        <LivePagePreview href={href} as={as} title={title} />
        {badge && !list && <span className="pointer-events-none absolute top-0 left-0 card-layout:top-2 card-layout:left-2">{badge}</span>}
      </span>
      {onClick
        ? <button type="button" onClick={onClick} className={action}>{label}</button>
        : <Link href={href} className={action}>{label}</Link>}
    </div>
  );
}

const listClass = (view: GuideView, cols = 4) => (view === "list" ? "grid gap-x-6 lg:grid-cols-2 card-layout:mt-5 card-layout:gap-2" : cx("grid gap-x-6 gap-y-8 sm:grid-cols-2 card-layout:mt-5 card-layout:gap-4", cols === 4 ? "xl:grid-cols-4 card-layout:lg:grid-cols-4" : cols === 5 ? "lg:grid-cols-3 card-layout:xl:grid-cols-5" : "lg:grid-cols-3"));

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

/** A numbered Swiss section: the label column (number, heading, one line, any controls) on the left, content on the right. */
function Section({ n, id, title, body, aside, art, children }: { art?: SectionArt; n: string; id: string; title: string; body: string; aside?: React.ReactNode; children: React.ReactNode }) {
  const cards = useLook() !== "swiss";
  if (cards && !art) return <section aria-labelledby={id}><h2 id={id} className="sr-only">{title}</h2>{children}</section>;
  if (cards && art) {
    return (
      <section aria-labelledby={id} className={cx("grid gap-6 rounded-2xl border border-line bg-surface p-6 sm:p-8", id === "roles-h" ? "mt-14" : "mt-6")}>
        <SectionHead id={id} title={title} body={body} icon={art.icon} tint={art.tint}>{aside}</SectionHead>
        {children}
      </section>
    );
  }
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
  return <GuidePreviews><Guide /></GuidePreviews>;
}

function Guide() {
  const cards = useLook() !== "swiss";
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
  const asVisitor = async () => { await data.auth.signOut(); router.push(basePath === "/hub" ? "/home/" : "/"); };
  const reset = async () => { await data.demo?.reset(); toast({ message: "Sample data reset", tone: "success" }); };
  const startInvite = async () => {
    const r = await data.demo?.signInAs("invited");
    router.push(`/join/?invite=${r?.inviteToken ?? ""}`);
  };
  const startOwner = async () => {
    await data.demo?.signInAs("owner");
    router.push("/owners/");
  };

  const steps: { n: string; icon: Icon3DName; tint: string; href: string; as?: string; title: string; body: string; label: string; onClick?: () => void }[] = [
    { n: "Step 1", icon: "envelope", tint: "bg-tint-peach", href: "/emails/invite/", title: "The invite", body: "What the 500 waitlist sign-ups receive: professional onboarding is open, with a personal link.", label: "Open the invite email" },
    { n: "Step 2", icon: "waving_hand", tint: "bg-tint-mint-soft", href: invitePage, as: "invited", title: "Join and fill in the page", body: "Create the account from the invite, fill in the profile right on the page clients will see, and send it for review.", label: "Start as an invited Gigster", onClick: startInvite },
    { n: "Step 3", icon: "clipboard", tint: "bg-tint-butter", href: "/owners/", as: "owner", title: "Owners review and invite", body: "Who's waiting for review, approve or suggest edits, and invite the waitlist in bulk.", label: "Open the owner dashboard", onClick: startOwner },
  ];
  const coverCard = "after:absolute after:inset-0 after:rounded-xl";

  return (
    <Page bare>
      <BrandBand eyebrow="Between Gigs 2.0 · Hub" title="Extraordinary talent." accent="Everyday solutions.">
        <p className="mt-4 max-w-xl text-body-lg text-ink-muted">Your profile, the owner dashboard, and everything we’re building. Explore the guided demos below with fictional sample data.</p>
        <nav aria-label="Hub shortcuts" className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/preview/profiles/" className="inline-flex min-h-11 items-center gap-3 rounded-md text-label-md text-ink hover:underline">
            <span aria-hidden="true" className="flex -space-x-2">
              {profiles.map((p) => <img key={p.id} src={asset(`art/samples/cards/${p.img}-portrait.jpg`)} alt="" className="size-9 rounded-full border-2 border-bg object-cover" />)}
            </span>
            Sample profiles
          </Link>
          <Link href="/preview/design-system/" className={shortcut}>Design system</Link>
          <Link href="/preview/gigster-journey/" className={shortcut}>Stage 2 journey</Link>
          <Link href="/preview/profile-editor/" className={shortcut}>Profile editor</Link>
          <Link href="/preview/wallpapers/" className={shortcut}>Wallpapers</Link>
          <ThemeBadge />
        </nav>
      </BrandBand>
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-6 sm:pt-12">
        <section aria-labelledby="experience-h" className="mb-8 grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-7">
          <div><h2 id="experience-h" className="font-display text-heading-lg text-ink">Choose your experience</h2><p className="mt-1 text-body-md text-ink-muted">One account can be both a Gigster and part of the team.</p></div>
          <div className="grid gap-3 md:grid-cols-3">
            {basePath === "/hub" ? <a href="/profile/canvas/" className="grid gap-2 rounded-xl border border-line p-5 text-ink hover:bg-surface-hover"><span className="text-label-sm text-ink-muted">01 · YOUR ACCOUNT</span><strong className="font-display text-heading-md">Gigster experience ↗</strong><span className="text-body-sm text-ink-muted">Create or edit your own profile.</span></a> : <Link href="/profile/canvas/" className="grid gap-2 rounded-xl border border-line p-5 text-ink hover:bg-surface-hover"><span className="text-label-sm text-ink-muted">01 · SAMPLE ACCOUNT</span><strong className="font-display text-heading-md">Gigster experience ↗</strong><span className="text-body-sm text-ink-muted">Try creating and editing a profile.</span></Link>}
            {basePath === "/hub" ? <a href="/owners/" className="grid gap-2 rounded-xl border border-line p-5 text-ink hover:bg-surface-hover"><span className="text-label-sm text-ink-muted">02 · YOUR ACCOUNT</span><strong className="font-display text-heading-md">Owner experience ↗</strong><span className="text-body-sm text-ink-muted">Dashboard, reviews and staff access.</span></a> : <button type="button" onClick={() => void startOwner()} className="grid gap-2 rounded-xl border border-line p-5 text-left text-ink hover:bg-surface-hover"><span className="text-label-sm text-ink-muted">02 · SAMPLE ACCOUNT</span><strong className="font-display text-heading-md">Owner experience ↗</strong><span className="text-body-sm text-ink-muted">Try the dashboard, reviews and staff access.</span></button>}
            <a href="#tools-h" className="grid gap-2 rounded-xl border border-line p-5 text-ink hover:bg-surface-hover"><span className="text-label-sm text-ink-muted">03 · PUBLIC TESTING</span><strong className="font-display text-heading-md">Hub directory ↓</strong><span className="text-body-sm text-ink-muted">Browse tools, artwork and work in progress.</span></a>
          </div>
        </section>
        <Section n="01" id="journey-steps-h" title="Start here" body="The whole Gigster journey in three steps, from the invite to the owner's review.">
          <ol className="grid gap-x-6 gap-y-8 md:grid-cols-3">
            {steps.map((s, i) => {
              const now = i === 1 && !cards;
              return (
                <li key={s.n}>
                  <Reveal effect="fade-up" delay={i * 70} className={cx("relative flex h-full flex-col gap-4 rounded-xl card-layout:rounded-2xl card-layout:bg-surface card-layout:shadow-lg border border-line bg-surface-raised p-5 swiss:border-0 swiss:border-t-4 swiss:bg-transparent swiss:p-0", now ? "border-tint-mint bg-tint-mint! p-5! text-forest-950" : "swiss:border-line-strong swiss:pt-4 text-ink")}>
                    <LivePagePreview href={s.href} as={s.as} title={s.title} />
                    <div className="flex items-start gap-4 card-layout:items-center card-layout:gap-3">
                      {cards ? <span aria-hidden="true" className={cx("grid size-12 shrink-0 place-items-center rounded-xl", s.tint)}><Icon3D name={s.icon} className="size-8" /></span> : <span aria-hidden="true" className="font-display text-stat tabular-nums">{i + 1}</span>}
                      <div className="grid gap-1 pt-1">
                        <span className="text-eyebrow uppercase">{now ? `${s.n} · Start here` : s.n}</span>
                        <h3 className="font-display text-heading-md">{s.title}</h3>
                      </div>
                    </div>
                    <p className={cx("text-body-md", now ? "text-forest-950" : "text-ink-muted")}>{s.body}</p>
                    <div className="mt-auto pt-1">
                      {s.onClick
                        ? <Button variant={i === 1 ? "primary" : "secondary"} size={now ? "lg" : "md"} iconEnd={<ArrowRight />} onClick={s.onClick} className={cx(coverCard, now && onMint)}>{s.label}</Button>
                        : <ButtonLink href={s.href} iconEnd={<ArrowRight />} className={coverCard}>{s.label}</ButtonLink>}
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </Section>
        <Section art={{ icon: "artist_palette", tint: "bg-tint-butter" }} n="02" id="design-system-h" title="Design system"
          body="The theme in use, live. Switch themes or Unstyled here and every preview on this page follows.">
          <DesignSystemBlock />
        </Section>
        <Section art={{ icon: "briefcase", tint: "bg-tint-sage" }} n="03" id="sample-profiles-h" title="Completed Gigster profiles"
          body="See how four entertainment professionals turn their craft into services you can hire them for."
          aside={<ButtonLink size="sm" href="/preview/profiles/" iconEnd={<ArrowRight />}>Compare all four</ButtonLink>}>
          <ul className={listClass(view, 4)}>
            {profiles.map((p) => (
              <li key={p.id}><GuideCard view={view} href={`/p/${p.id}/`} title={p.name} body={p.title} /></li>
            ))}
          </ul>
        </Section>
        {data.demo && (
          <Section art={{ icon: "admission_tickets", tint: "bg-tint-sky" }} n="04" id="roles-h" title="Try every role" body="Step into the sample as anyone. No sign-in needed: it uses the fictional sample accounts, kept in this browser."
            aside={<div className="flex flex-wrap items-center gap-2 pt-2">{viewSwitch}<Button size="sm" variant="ghost" iconStart={<RotateCcw />} onClick={reset}>Reset sample data</Button></div>}>
            <h3 className="text-eyebrow text-ink-muted uppercase">Team and start</h3>
            <ul className={cx("mt-4", listClass(view, 3))}>
              <li><GuideCard view={view} href="/owners/" as="owner" tag="Owner" title="Open as owner" body="Dashboard, review queue, people, waitlist." onClick={startOwner} /></li>
              <li><GuideCard view={view} href={invitePage} as="invited" tag="Invited" title="Open the invite" body="Create the account, then fill in the profile." onClick={startInvite} /></li>
              <li><GuideCard view={view} href="/" tag="Visitor" title="Sign out" body="See the site as the public does." onClick={asVisitor} /></li>
            </ul>
            <h3 className="mt-12 text-eyebrow text-ink-muted uppercase">Practice each onboarding stage</h3>
            <ul className={cx("mt-4", listClass(view, 3))}>
              {gigsters.map((g, i) => (
                <li key={g.id}><GuideCard view={view} href={g.go} as={`gigster:${g.id}`} tag="Gigster" step={`${i + 1} · ${g.stage}`} title={`Sign in as ${g.name}`} body={g.state} onClick={() => asGigster(g.id, g.go)} /></li>
              ))}
            </ul>
          </Section>
        )}
        {groups.map((gr, gi) => (
          <Section key={gr.id} art={gr.art} n={String(gi + (data.demo ? 5 : 4)).padStart(2, "0")} id={`${gr.id}-h`} title={gr.title} body={gr.body}
            aside={!data.demo && gi === 0 ? <div className="pt-2">{viewSwitch}</div> : undefined}>
            <ul className={listClass(view, gr.pages.length)}>
              {gr.pages.map((pg) => <li key={pg.href}><GuideCard view={view} title={pg.title} body={pg.body} href={pg.href} /></li>)}
            </ul>
          </Section>
        ))}
        <p className="mt-16 border-t border-line pt-4 text-body-sm text-ink-muted card-layout:mt-6 card-layout:border-0">Names shown are illustrative samples for this draft.</p>
      </div>
    </Page>
  );
}
