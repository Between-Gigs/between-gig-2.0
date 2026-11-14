"use client";
/*
 * The design system, live (/preview/design-system/, linked from the preview hub and the Theme menu). Organised like a
 * reference: an "On this page" rail, then Foundations (brand, colour, type, shape, icons), Components (atoms,
 * molecules, organisms, site patterns, the full library), the pages built from them, and last the review tools (themes,
 * Unstyled). Everything renders with the real components and tokens, so Day/Night and the theme switch apply here.
 * Reorganised 14 Nov 2026 (Justin): page layout only; no component or token changed. Figma: "Between Gigs Flow".
 */
import { cx } from "@ds/components/cx";
import { ArrowRight, ArrowUpRight, Camera, Check, Heart, LogIn, MapPin, PencilLine, Scissors, Search, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type * as React from "react";
import { selectLook, setUnstyled, useLook, useUnstyled } from "@/components/site/LookSync";
import { Page } from "@/components/site/Page";
import { lookIds, looks, type Look } from "@/lib/look";
import { Badge, Banner, IconButton, Kbd, Progress, SegmentedControl, Skeleton, Tag, ThemeToggle } from "@ds/components";
import { Avatar, Button, Checkbox, Divider, Eyebrow, Heading, Input, Logo, Price, Quote, Status, Switch, Text, TextLink } from "./atoms";
import { libraryComponents } from "./library";
import { AddTile, Alert, Completeness, Field, RateBlock, SectionHeading, ServiceRow, StepNavItem } from "./molecules";
import { AuthCard, ProfileResultCard, ServiceTile } from "./organisms";

const FIGMA = "https://www.figma.com/design/v6k7hYScnXIg7npLDrt97G/Between-Gigs-Flow";
const figma = (node: string) => `${FIGMA}?node-id=${node}`;

/** Pages to try a theme on. Each link switches the theme first, then opens the page. */
const tryOn = [
  { href: "/join/", label: "Create account" },
  { href: "/p/", label: "Find a professional" },
  { href: "/p/maya/", label: "Public profile" },
  { href: "/emails/invite/", label: "Invite email" },
];

/** The pages built from the system, in the order a visitor, a Gigster and the team meet them. */
const templates: { group: string; title: string; href: string; code: string; node?: string }[] = [
  { group: "Public site", title: "Home · Coming soon", href: "/", code: "landing/ComingSoon" },
  { group: "Public site", title: "For professionals", href: "/professionals/", code: "landing/ForProfessionals" },
  { group: "Public site", title: "Crew Call", href: "/crew-call/", code: "crew-call/CrewCall" },
  { group: "Public site", title: "Storyboard", href: "/storyboard/", code: "storyboard/StoryBook" },
  { group: "Gigsters", title: "Create account / Log in", href: "/join/", code: "AuthStageTemplate", node: "57-605" },
  { group: "Gigsters", title: "Edit on your profile", href: "/profile/canvas/", code: "gigster/editor/GigsterEditor" },
  { group: "Gigsters", title: "My profile", href: "/profile/", code: "profile/MyProfile", node: "60-825" },
  { group: "Gigsters", title: "Public profile", href: "/p/maya/", code: "ProfileTemplate", node: "59-802" },
  { group: "Gigsters", title: "Find a professional", href: "/p/", code: "SearchTemplate", node: "60-866" },
  { group: "Team", title: "Owner dashboard", href: "/owners/", code: "owners/OwnerDashboard" },
  { group: "Team", title: "Review a profile", href: "/owners/people/imani-carter/", code: "owners/OwnerPerson" },
  { group: "Team", title: "Emails", href: "/emails/", code: "emails/*.ts", node: "57-678" },
];

/** The "On this page" rail. Ids #foundations and #themes are linked from the hub and the Theme menu: keep them. */
const nav: { group: string; items: { id: string; label: string }[] }[] = [
  { group: "Foundations", items: [{ id: "brand", label: "Brand" }, { id: "foundations", label: "Colour" }, { id: "type", label: "Type" }, { id: "shape", label: "Shape & depth" }, { id: "icons", label: "Icons" }] },
  { group: "Components", items: [{ id: "atoms", label: "Atoms" }, { id: "molecules", label: "Molecules" }, { id: "organisms", label: "Organisms" }, { id: "patterns", label: "Site patterns" }, { id: "library", label: "Full library" }] },
  { group: "Pages", items: [{ id: "templates", label: "Templates & pages" }] },
  { group: "Review tools", items: [{ id: "themes", label: "Themes" }, { id: "mode", label: "Unstyled mode" }] },
];

const colourGroups: { group: string; note: string; swatches: { name: string; cls: string; text?: string }[] }[] = [
  { group: "Surfaces", note: "Page, cards, sunken bands and hover.", swatches: [
    { name: "bg", cls: "bg-bg" }, { name: "surface", cls: "bg-surface" }, { name: "surface-sunken", cls: "bg-surface-sunken" }, { name: "surface-hover", cls: "bg-surface-hover" }] },
  { group: "Brand & action", note: "Forest for buttons and seals, gold for rules and accents.", swatches: [
    { name: "surface-brand", cls: "bg-surface-brand", text: "text-ink-on-brand" }, { name: "action", cls: "bg-action", text: "text-on-action" }, { name: "accent-gold", cls: "bg-accent-gold" }, { name: "accent-gold-soft", cls: "bg-accent-gold-soft" }] },
  { group: "Lines", note: "Hairlines between sections; strong for focus and selection.", swatches: [
    { name: "line", cls: "bg-line" }, { name: "line-strong", cls: "bg-line-strong", text: "text-bg" }] },
  { group: "Status", note: "Soft fills behind status text: never colour alone.", swatches: [
    { name: "success-soft", cls: "bg-success-soft" }, { name: "warning-soft", cls: "bg-warning-soft" }, { name: "danger-soft", cls: "bg-danger-soft" }] },
];
const inks = [
  { name: "ink", cls: "text-ink" }, { name: "ink-muted", cls: "text-ink-muted" }, { name: "ink-brand", cls: "text-ink-brand" }, { name: "ink-disabled", cls: "text-ink-disabled" },
];

const type: { name: string; cls: string; sample: string }[] = [
  { name: "Display/XL · text-display-xl", cls: "font-display text-display-xl", sample: "Your craft." },
  { name: "Display/L · text-display-lg", cls: "font-display text-display-lg", sample: "More possibilities." },
  { name: "H1 · text-display-md", cls: "font-display text-display-md", sample: "Find a professional" },
  { name: "H2 · text-display-sm", cls: "font-display text-display-sm", sample: "How I can help" },
  { name: "H3 · text-heading-lg", cls: "font-display text-heading-lg", sample: "Wardrobe & styling" },
  { name: "Body L · text-body-lg", cls: "text-body-lg", sample: "Bring the work you already have." },
  { name: "Body M · text-body-md", cls: "text-body-md", sample: "Show what your skills can offer, on set and beyond." },
  { name: "Label · text-label-md", cls: "text-label-md font-semibold", sample: "Profile completeness" },
  { name: "Eyebrow · text-eyebrow", cls: "text-eyebrow tracking-widest uppercase", sample: "Welcome to Between Gigs" },
  { name: "Price · text-stat", cls: "font-display text-stat", sample: "$45 / hr" },
];

export function DesignSystemPage() {
  const current = useLook();
  const plain = useUnstyled();
  const active = useActiveSection(nav.flatMap((g) => g.items.map((i) => i.id)));
  return (
    <Page>
      <header className="grid gap-5 border-b border-line pb-10">
        <Eyebrow rule>Preview · Design system</Eyebrow>
        <Heading level="display-l" as="h1">Design system</Heading>
        <Text size="lg" muted className="max-w-3xl">
          The building blocks of every Between Gigs screen, live: the tokens, the components and the pages made from them.
          Everything here is the real code, so the Day/Night switch in the header changes this page too.
        </Text>
        <div className="flex flex-wrap items-center gap-2">
          <Status tone="brand" dot={false}><Check aria-hidden="true" className="size-3" />In use: {plain ? "Unstyled" : looks[current].name}</Status>
          <Status dot={false}>Day and Night</Status>
          <Status dot={false}>{libraryComponents.length} library components</Status>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            { title: "Tokens, never raw values", body: "Every colour, size and radius comes from a token, so a theme or Night mode changes it everywhere." },
            { title: "Editorial, not decorated", body: "Serif headings, quiet lines and real photos. Plain line icons; no emoji or 3D icons." },
            { title: "Readable first", body: "Text keeps its contrast in both modes, targets are at least 44px, and focus is always visible." },
          ].map((p) => <li key={p.title} className="grid gap-1 rounded-lg border border-line bg-surface p-4"><p className="text-label-md font-semibold text-ink">{p.title}</p><Text size="sm" muted>{p.body}</Text></li>)}
        </ul>
        <p className="flex flex-wrap gap-x-6 gap-y-1">
          <TextLink href={figma("63-1062")} kind="external" target="_blank" rel="noreferrer">Figma components</TextLink>
          <TextLink href={figma("56-605")} kind="external" target="_blank" rel="noreferrer">Figma foundations</TextLink>
          <TextLink href="/preview/" kind="arrow">Back to the preview hub</TextLink>
        </p>
      </header>

      <div className="grid gap-x-10 lg:grid-cols-12">
        <SideNav active={active} />
        <div className="min-w-0 lg:col-span-9">
          <Group title="Foundations" />
          <Section id="brand" title="Brand" lead="The logo in its three layouts, the brand line and the seal. Code: @ds/components/Logo.">
            <div className="grid gap-4 md:grid-cols-3">
              <Spec label="Wide" code={'<Logo />'}><Logo height={44} /></Spec>
              <Spec label="Stacked" code={'<Logo layout="stacked" />'}><Logo layout="stacked" height={88} /></Spec>
              <Spec label="Mark" code={'<Logo layout="mark" />'}><Logo layout="mark" height={44} /></Spec>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Spec label="Brand line" code="font-display · text-ink-brand">
                <p className="font-display text-heading-lg text-ink">Extraordinary talent. <span className="text-ink-brand">Everyday solutions.</span></p>
              </Spec>
              <Spec label="Coming soon seal" code="landing/ComingSoon">
                <p className="inline-flex items-center gap-4 rounded-full bg-surface-brand px-8 py-2.5 text-label-md font-bold tracking-widest text-ink-on-brand uppercase shadow-md ring-1 ring-accent-gold/40">
                  <span aria-hidden="true" className="h-px w-8 bg-accent-gold" />Coming soon<span aria-hidden="true" className="h-px w-8 bg-accent-gold" />
                </p>
              </Spec>
            </div>
          </Section>

          <Section id="foundations" title="Colour" lead={`Semantic tokens in the current theme (${plain ? "Unstyled" : looks[current].name}), in ${"the mode you're viewing"}. Switch Day/Night in the header to see the other. Code: styles/look-*.css.`}>
            <div className="grid gap-8">
              {colourGroups.map((g) => (
                <div key={g.group} className="grid gap-3">
                  <div className="flex flex-wrap items-baseline gap-x-3"><h3 className="text-label-md font-semibold text-ink">{g.group}</h3><Text size="sm" muted>{g.note}</Text></div>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {g.swatches.map((c) => (
                      <li key={c.name} className="grid gap-2">
                        <span className={cx("grid h-16 place-items-end justify-start rounded-md border border-line p-2 text-caption", c.cls, c.text ?? "text-ink")}>Aa</span>
                        <code className="text-caption text-ink-muted">{c.name}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="grid gap-3">
                <div className="flex flex-wrap items-baseline gap-x-3"><h3 className="text-label-md font-semibold text-ink">Ink</h3><Text size="sm" muted>Text colours, on the page background.</Text></div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {inks.map((c) => <li key={c.name} className="grid gap-1 rounded-md border border-line bg-bg p-3"><span className={cx("font-display text-heading-lg", c.cls)}>Aa</span><code className="text-caption text-ink-muted">{c.name}</code></li>)}
                </ul>
              </div>
            </div>
          </Section>

          <Section id="type" title="Type" lead="Newsreader serif for headings and prices, the sans for everything else. Each row is the class to use.">
            <ul className="grid gap-4">
              {type.map((t) => (
                <li key={t.name} className="grid gap-1 border-b border-line pb-4 md:grid-cols-4 md:items-baseline md:gap-6">
                  <code className="text-caption text-ink-muted">{t.name}</code>
                  <p className={cx("min-w-0 break-words text-ink md:col-span-3", t.cls)}>{t.sample}</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="shape" title="Shape & depth" lead="Corner radii and the shadow scale. shadow-lift casts upward, under the footer.">
            <div className="grid gap-4 md:grid-cols-2">
              <Spec label="Radius" code="rounded-*">
                <div className="flex flex-wrap gap-4">
                  {["rounded-xs", "rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-full"].map((r) => (
                    <span key={r} className="grid gap-2 text-center"><span className={cx("size-12 border-2 border-line-strong bg-surface-sunken", r)} /><code className="text-caption text-ink-muted">{r.replace("rounded-", "")}</code></span>
                  ))}
                </div>
              </Spec>
              <Spec label="Shadow" code="shadow-*">
                <div className="flex flex-wrap gap-5">
                  {["shadow-xs", "shadow-sm", "shadow-md", "shadow-lg", "shadow-lift"].map((s) => (
                    <span key={s} className="grid gap-2 text-center"><span className={cx("size-12 rounded-md bg-surface", s)} /><code className="text-caption text-ink-muted">{s.replace("shadow-", "")}</code></span>
                  ))}
                </div>
              </Spec>
            </div>
          </Section>

          <Section id="icons" title="Icons" lead="Lucide line icons at 16, 20 and 24px, in the text colour. A new icon goes through the create-icon skill; never emoji.">
            <Spec label="Common icons" code="lucide-react">
              <div className="flex flex-wrap items-center gap-5 text-ink">
                {[Search, MapPin, UserRound, PencilLine, Heart, Camera, Scissors, Sparkles, LogIn, ArrowRight].map((Icon, i) => <Icon key={i} aria-hidden="true" className="size-6" />)}
                <span className="mx-2 h-6 w-px bg-line" aria-hidden="true" />
                <Search aria-hidden="true" className="size-4" /><Search aria-hidden="true" className="size-5" /><Search aria-hidden="true" className="size-6" />
              </div>
            </Spec>
          </Section>

          <Group title="Components" />
          <Section id="atoms" title="Atoms" lead="The smallest pieces. Code: components/ds/atoms." figmaNode="63-1062">
            <div className="grid gap-5 rounded-lg border border-line bg-surface p-5">
              <Row label="Button">
                <Button variant="primary">Create my profile</Button><Button>Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="primary" disabled>Disabled</Button>
              </Row>
              <Row label="Status">
                <Status>Draft</Status><Status tone="success">Live</Status><Status tone="warning">In review</Status><Status tone="danger">Changes asked</Status><Status tone="brand">Available for work</Status><Status tone="gold">Coming soon</Status>
              </Row>
              <Row label="Link"><TextLink href="#atoms">Inline link</TextLink><TextLink href="#atoms" kind="arrow">Next step</TextLink><TextLink href="#atoms" kind="external">View profile</TextLink></Row>
              <Row label="Controls">
                <Checkbox label="Wardrobe & costume" defaultChecked /><SampleSwitch />
                <span className="w-64 max-w-full"><Input placeholder="Name, craft or service" aria-label="Sample input" /></span>
              </Row>
              <Row label="Avatar"><Avatar name="Maya Chen" size="sm" /><Avatar name="Maya Chen" /><Avatar name="Maya Chen" size="lg" /></Row>
              <Row label="Text"><Price>$45 / hr</Price><Quote>“Good clothes, made to last.”</Quote></Row>
              <Row label="Divider" last><span className="w-full"><Divider /></span></Row>
            </div>
          </Section>

          <Section id="molecules" title="Molecules" lead="Small groups of atoms with one job. Code: components/ds/molecules." figmaNode="63-1072">
            <div className="grid gap-4 md:grid-cols-2">
              <Spec label="Field" code="Field"><Field label="Full name" hint="As you want clients to see it."><Input defaultValue="Maya Chen" /></Field></Spec>
              <Spec label="Alert" code="Alert"><div className="grid gap-2"><Alert title="Saved">It saves as you go.</Alert><Alert tone="warning" title="In review">We'll email you when it's approved.</Alert></div></Spec>
              <Spec label="Completeness" code="Completeness"><Completeness value={64} /></Spec>
              <Spec label="Step navigation" code="StepNavItem">
                <div className="grid gap-1"><StepNavItem state="done">1. About you</StepNavItem><StepNavItem state="current">2. Where & when</StepNavItem><StepNavItem>3. Your story</StepNavItem><StepNavItem state="locked">Private contact</StepNavItem></div>
              </Spec>
              <Spec label="Add tile" code="AddTile"><AddTile label="Upload a photo" hint="JPG, PNG or HEIC" /></Spec>
              <Spec label="Rate block" code="RateBlock"><RateBlock price="$45 / hr" minimum="2-hour minimum" availability="Weekday mornings" earliest="Earliest start · Nov 18" /></Spec>
              <Spec label="Section heading and service row" code="SectionHeading · ServiceRow" wide>
                <div className="grid gap-4"><SectionHeading eyebrow="Services" title="How I can help" level="h2" /><div className="border-t border-line"><ServiceRow name="Closet organization" description="Edit and organise a wardrobe so getting dressed is easy." /></div></div>
              </Spec>
            </div>
          </Section>

          <Section id="organisms" title="Organisms" lead="Self-contained sections. Code: components/ds/organisms." figmaNode="63-1085">
            <div className="grid gap-4">
              <Spec label="Profile result card" code="ProfileResultCard">
                <ProfileResultCard href="/p/maya/" name="Maya Chen" service="Wardrobe & styling" line="Organizes closets and builds outfits from your own wardrobe."
                  area="Eastside, Downtown" availability="Weekday mornings" rate="$45/hr" minimum="2-hour minimum" photo="img/people/maya.jpg" />
              </Spec>
              <div className="grid gap-4 md:grid-cols-2">
                <Spec label="Service tile" code="ServiceTile"><ServiceTile icon={Scissors} title="Alterations" description="Hems, fit and repairs for everyday clothes." href="/p/" /></Spec>
                <Spec label="Auth card" code="AuthCard">
                  <AuthCard title="Create your account">
                    <Field label="Email"><Input type="email" defaultValue="maya.chen@example.com" /></Field>
                    <Button variant="primary" fullWidth>Create my profile</Button>
                  </AuthCard>
                </Spec>
              </div>
            </div>
          </Section>

          <Section id="patterns" title="Site patterns" lead="The shared pieces every page uses. They live in components/site and appear on this page itself.">
            <ul className="grid gap-4 md:grid-cols-2">
              {[
                { title: "Header", code: "site/SiteHeader", body: "Logo, the Los Angeles Call Sheet in the middle for visitors, Day/Night and Sign in; the account menu with the photo once signed in." },
                { title: "Footer", code: "site/SiteFooter", body: "One footer on every page: a soft band with an upward shadow, the brand line, Explore and Legal links." },
                { title: "Photo stage", code: "ds/organisms · PhotoStage", body: "A full-bleed still life behind a hero, with its own night photo (no overlays). Used by Home and the auth pages." },
                { title: "Day / Night", code: "@ds/components · ThemeToggle", body: "Remembers the visitor's choice. Photos switch to their night versions; tokens switch everywhere." },
              ].map((p) => (
                <li key={p.title}><Spec label={p.title} code={p.code}><Text size="sm" muted>{p.body}</Text></Spec></li>
              ))}
            </ul>
          </Section>

          <Section id="library" title="Full library" lead="Everything in the shared component library (packages/design-system), with a few live samples. Product pages use the atoms above; the rest powers the owner tools, Studio and the workspace.">
            <div className="grid gap-4 md:grid-cols-2">
              <Spec label="Banner" code="Banner"><Banner tone="success" title="Profile approved">You're on the call sheet.</Banner></Spec>
              <Spec label="Badge, tag and kbd" code="Badge · Tag · Kbd">
                <div className="flex flex-wrap items-center gap-2"><Badge tone="brand">Owner</Badge><Badge tone="warning">2 waiting</Badge><Tag>Wardrobe</Tag><Tag selected>Styling</Tag><Kbd keys={["⌘", "K"]} /></div>
              </Spec>
              <Spec label="Segmented control" code="SegmentedControl"><SampleSegments /></Spec>
              <Spec label="Icon button and Day/Night" code="IconButton · ThemeToggle">
                <div className="flex flex-wrap items-center gap-3"><IconButton label="Search" icon={<Search />} variant="secondary" /><IconButton label="Edit" icon={<PencilLine />} variant="ghost" /><ThemeToggle size="sm" showLabel={false} /></div>
              </Spec>
              <Spec label="Progress" code="Progress"><Progress value={64} label="Profile" valueText="64%" /></Spec>
              <Spec label="Skeleton" code="Skeleton"><div className="grid gap-2"><Skeleton className="h-6 w-2/3" /><Skeleton /><Skeleton /></div></Spec>
            </div>
            <ul aria-label="Library components" className="flex flex-wrap gap-2">
              {libraryComponents.map((name) => <li key={name}><code className="inline-flex min-h-8 items-center rounded-md border border-line bg-surface px-2.5 text-caption text-ink">{name}</code></li>)}
            </ul>
          </Section>

          <Group title="Pages" />
          <Section id="templates" title="Templates & pages" lead="The pages made from the system, filled with sample data. Open one in the current theme, or compare it in Figma." figmaNode="57-605">
            <div className="grid gap-6">
              {[...new Set(templates.map((t) => t.group))].map((group) => (
                <div key={group} className="grid gap-3">
                  <h3 className="text-label-md font-semibold text-ink">{group}</h3>
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {templates.filter((t) => t.group === group).map((t) => (
                      <li key={t.title} className="grid content-start gap-2 rounded-lg border border-line bg-surface p-4">
                        <p className="font-display text-heading-md text-ink">{t.title}</p>
                        <code className="text-caption break-all text-ink-muted">{t.code}</code>
                        <span className="flex flex-wrap gap-x-4">
                          <TextLink href={t.href} kind="arrow">Open page</TextLink>
                          {t.node && <TextLink href={figma(t.node)} kind="external" target="_blank" rel="noreferrer">Figma</TextLink>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          <Group title="Review tools" />
          <Section id="themes" title="Themes" lead="Alternatives kept for comparison; Green Room is the chosen theme. Choosing one restyles the site in place for you only; Day/Night stays as it is. Coming soon and For professionals keep their approved design in every theme.">
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {lookIds.map((look) => <ThemeCard key={look} look={look} active={current === look && !plain} />)}
            </ul>
          </Section>

          <Section id="mode" title="Unstyled mode" lead="A wireframe of any page: plain type, grey lines, no colour or art. Good for reviewing content and flow.">
            <div role="radiogroup" aria-label="Mode" className="inline-flex w-fit rounded-lg border border-line bg-surface p-1">
              {[{ on: false, label: "Styled" }, { on: true, label: "Unstyled" }].map((m) => (
                <button key={m.label} type="button" role="radio" aria-checked={plain === m.on} onClick={() => setUnstyled(m.on)}
                  className={cx("min-h-11 rounded-md px-5 text-label-md font-semibold transition-colors duration-fast",
                    plain === m.on ? "bg-action text-on-action" : "text-ink hover:bg-surface-hover")}>{m.label}</button>
              ))}
            </div>
            <Text size="sm" muted>Share a link in either mode: add <code>?unstyled=1</code> or <code>?unstyled=0</code> to any page.</Text>
          </Section>
        </div>
      </div>
    </Page>
  );
}

/** Which section is in view, for the rail. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join(",");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target.id, e.isIntersecting);
      const first = key.split(",").find((id) => seen.get(id));
      if (first) setActive(first);
    }, { rootMargin: "-20% 0px -60% 0px" });
    for (const id of key.split(",")) { const el = document.getElementById(id); if (el) io.observe(el); }
    return () => io.disconnect();
  }, [key]);
  return active;
}

function SideNav({ active }: { active: string }) {
  return (
    <nav aria-label="On this page" className="border-b border-line py-6 lg:col-span-3 lg:border-b-0 lg:py-10">
      <div className="grid gap-5 lg:sticky lg:top-28">
        <p className="text-eyebrow text-ink-muted uppercase">On this page</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:grid-cols-1">
          {nav.map((g) => (
            <div key={g.group} className="grid content-start gap-1">
              <p className="text-label-sm font-semibold text-ink">{g.group}</p>
              <ul className="grid">
                {g.items.map((i) => (
                  <li key={i.id}>
                    <a href={`#${i.id}`} aria-current={active === i.id ? "location" : undefined}
                      className={cx("flex min-h-9 items-center border-l-2 pl-3 text-body-sm transition-colors duration-fast",
                        active === i.id ? "border-ink-brand font-semibold text-ink" : "border-line text-ink-muted hover:border-line-strong hover:text-ink")}>{i.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}

/** A group label between sections (Foundations, Components, Pages, Review tools). */
function Group({ title }: { title: string }) {
  return <p className="pt-10 text-eyebrow tracking-widest text-ink-brand uppercase first:pt-10">{title}</p>;
}

/** One specimen: a labelled card with the component's name in code. */
function Spec({ label, code, wide = false, children }: { label: string; code: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <figure className={cx("grid h-full content-start gap-4 rounded-lg border border-line bg-surface p-5", wide && "md:col-span-2")}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-label-md font-semibold text-ink">{label}</span>
        <code className="text-caption text-ink-muted">{code}</code>
      </figcaption>
      <div className="min-w-0">{children}</div>
    </figure>
  );
}

function SampleSegments() {
  const [view, setView] = useState("gallery");
  return <SegmentedControl label="View" value={view} onChange={setView} options={[{ value: "gallery", label: "Gallery" }, { value: "list", label: "List" }, { value: "map", label: "Map" }]} />;
}

function ThemeCard({ look, active }: { look: Look; active: boolean }) {
  const go = (href: string) => (event: React.MouseEvent) => { event.preventDefault(); setUnstyled(false); selectLook(look); window.location.assign((event.currentTarget as HTMLAnchorElement).href || href); };
  return (
    <li className={cx("grid content-start gap-3 rounded-lg border bg-surface p-4", active ? "border-line-strong ring-2 ring-border-focus" : "border-line")}>
      <span aria-hidden="true" className="look-option look-option-lg" data-option={look} />
      <div className="grid gap-1">
        <p className="flex flex-wrap items-center gap-2 font-display text-heading-md text-ink">{looks[look].name}{look === "editorial" && <Status tone="gold" dot={false}>Figma design system</Status>}{active && <Status tone="brand" dot={false}><Check aria-hidden="true" className="size-3" />In use</Status>}</p>
        <Text size="sm" muted>{looks[look].detail}</Text>
      </div>
      <Button variant={active ? "secondary" : "primary"} size="sm" onClick={() => { setUnstyled(false); selectLook(look); }} disabled={active}>{active ? "Current theme" : "Use this theme"}</Button>
      <p className="flex flex-wrap gap-x-3 gap-y-0 text-caption text-ink-muted">
        Try on:
        {tryOn.map((p) => <Link key={p.href} href={p.href} onClick={go(p.href)} className="inline-flex items-center gap-0.5 text-ink underline underline-offset-2">{p.label}<ArrowUpRight aria-hidden="true" className="size-3" /></Link>)}
      </p>
    </li>
  );
}

function Section({ id, title, lead, figmaNode, children }: { id: string; title: string; lead: string; figmaNode?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-28 gap-6 border-b border-line py-10 last:border-b-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid max-w-3xl gap-2">
          <Heading level="h2" as="h2" id={`${id}-h`}>{title}</Heading>
          <Text muted>{lead}</Text>
        </div>
        {figmaNode && <TextLink href={figma(figmaNode)} kind="external" target="_blank" rel="noreferrer">Open in Figma</TextLink>}
      </div>
      {children}
    </section>
  );
}

function SampleSwitch() {
  const [on, setOn] = useState(true);
  return <Switch label="Available for work" checked={on} onChange={setOn} />;
}

function Row({ label, last = false, children }: { label: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={cx("grid gap-3 md:grid-cols-6 md:items-center", !last && "border-b border-line pb-5")}>
      <p className="text-label-md font-semibold text-ink-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-3 md:col-span-5">{children}</div>
    </div>
  );
}
