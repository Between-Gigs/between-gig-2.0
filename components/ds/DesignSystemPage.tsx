"use client";
/*
 * The design system, live (/preview/design-system/, linked from the preview hub and the Theme menu). Everything below
 * renders with the theme and mode chosen at the top, so switching shows each option on real components. Figma: "Between
 * Gigs Flow" DS pages. Map: docs/design-system-v1.md.
 */
import { cx } from "@ds/components/cx";
import { ArrowUpRight, Camera, Check, Scissors } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type * as React from "react";
import { selectLook, setUnstyled, useLook, useUnstyled } from "@/components/site/LookSync";
import { Page } from "@/components/site/Page";
import { lookIds, looks, type Look } from "@/lib/look";
import { Avatar, Button, Checkbox, Divider, Eyebrow, Heading, Input, Price, Quote, Status, Switch, Text, TextLink } from "./atoms";
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

const templates = [
  { title: "Create account / Log in", href: "/join/", code: "AuthStageTemplate", node: "57-605" },
  { title: "Public profile", href: "/p/maya/", code: "ProfileTemplate", node: "59-802" },
  { title: "Find a professional", href: "/p/", code: "SearchTemplate", node: "60-866" },
  { title: "Profile builder", href: "/profile/edit/", code: "ProfileBuilder", node: "59-676" },
  { title: "Profile submitted", href: "/profile/", code: "ConfirmationTemplate", node: "60-825" },
  { title: "Invite email", href: "/emails/invite/", code: "emails/invite.ts", node: "57-678" },
];

const colours: { name: string; cls: string; text?: string }[] = [
  { name: "bg", cls: "bg-bg" }, { name: "surface", cls: "bg-surface" }, { name: "surface-sunken", cls: "bg-surface-sunken" },
  { name: "surface-hover", cls: "bg-surface-hover" }, { name: "surface-brand", cls: "bg-surface-brand", text: "text-ink-on-brand" },
  { name: "action", cls: "bg-action", text: "text-on-action" }, { name: "line", cls: "bg-line" }, { name: "line-strong", cls: "bg-line-strong", text: "text-bg" },
  { name: "success-soft", cls: "bg-success-soft" }, { name: "warning-soft", cls: "bg-warning-soft" }, { name: "danger-soft", cls: "bg-danger-soft" },
  { name: "accent-gold", cls: "bg-accent-gold" },
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
  return (
    <Page>
      <header className="grid gap-4 border-b border-line pb-8">
        <Eyebrow rule>Preview · Design system</Eyebrow>
        <Heading level="display-l" as="h1">Design system</Heading>
        <Text size="lg" muted className="max-w-3xl">
          Every theme and every building block, live. Pick a theme or switch to Unstyled below; the whole page, and the rest of the site, follows.
          Components are organised the atomic way: atoms, molecules, organisms, then templates and pages.
        </Text>
        <p className="flex flex-wrap gap-x-6 gap-y-1">
          <TextLink href={figma("63-1062")} kind="external" target="_blank" rel="noreferrer">Figma components</TextLink>
          <TextLink href={figma("56-605")} kind="external" target="_blank" rel="noreferrer">Figma foundations</TextLink>
          <TextLink href="/preview/" kind="arrow">Back to the preview hub</TextLink>
        </p>
      </header>

      <Section id="mode" title="Mode" lead="Styled shows the chosen theme. Unstyled is a wireframe of the same page: plain type, grey lines, no colour or art. Good for reviewing content and flow.">
        <div role="radiogroup" aria-label="Mode" className="inline-flex w-fit rounded-lg border border-line bg-surface p-1">
          {[{ on: false, label: "Styled" }, { on: true, label: "Unstyled" }].map((m) => (
            <button key={m.label} type="button" role="radio" aria-checked={plain === m.on} onClick={() => setUnstyled(m.on)}
              className={cx("min-h-11 rounded-md px-5 text-label-md font-semibold transition-colors duration-fast",
                plain === m.on ? "bg-action text-on-action" : "text-ink hover:bg-surface-hover")}>{m.label}</button>
          ))}
        </div>
        <Text size="sm" muted>Share a link in either mode: add <code>?unstyled=1</code> or <code>?unstyled=0</code> to any page.</Text>
      </Section>

      <Section id="themes" title="Themes" lead="Alternatives to show the client. Choosing one restyles the site in place; Day/Night stays as it is. Coming soon and For professionals keep their approved design in every theme.">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lookIds.map((look) => <ThemeCard key={look} look={look} active={current === look && !plain} />)}
        </ul>
      </Section>

      <Section id="foundations" title="Foundations" lead={`Tokens in the current theme (${plain ? "Unstyled" : looks[current].name}). Code: styles/look-*.css; Figma: Foundations.`}>
        <div className="grid gap-8">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {colours.map((c) => (
              <li key={c.name} className="grid gap-2">
                <span className={cx("grid h-16 place-items-end justify-start rounded-md border border-line p-2 text-caption", c.cls, c.text ?? "text-ink")}>Aa</span>
                <code className="text-caption text-ink-muted">{c.name}</code>
              </li>
            ))}
          </ul>
          <ul className="grid gap-4 border-t border-line pt-6">
            {type.map((t) => (
              <li key={t.name} className="grid gap-1 border-b border-line pb-4 md:grid-cols-4 md:items-baseline md:gap-6">
                <code className="text-caption text-ink-muted">{t.name}</code>
                <p className={cx("min-w-0 break-words text-ink md:col-span-3", t.cls)}>{t.sample}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-4">
            {["rounded-xs", "rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-full"].map((r) => (
              <span key={r} className="grid gap-2 text-center"><span className={cx("size-16 border-2 border-line-strong bg-surface-sunken", r)} /><code className="text-caption text-ink-muted">{r.replace("rounded-", "")}</code></span>
            ))}
            {["shadow-xs", "shadow-sm", "shadow-md", "shadow-lg"].map((s) => (
              <span key={s} className="grid gap-2 text-center"><span className={cx("size-16 rounded-md bg-surface", s)} /><code className="text-caption text-ink-muted">{s.replace("shadow-", "shadow ")}</code></span>
            ))}
          </div>
        </div>
      </Section>

      <Section id="atoms" title="Atoms" lead="The smallest pieces. Code: components/ds/atoms." figmaNode="63-1062">
        <div className="grid gap-6">
          <Row label="Button">
            <Button variant="primary">Create my profile</Button><Button>Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="primary" disabled>Disabled</Button>
          </Row>
          <Row label="Status">
            <Status>Draft</Status><Status tone="success">Live</Status><Status tone="warning">In review</Status><Status tone="danger">Changes asked</Status><Status tone="brand">Available for work</Status><Status tone="gold">Coming soon</Status>
          </Row>
          <Row label="Link"><TextLink href="#atoms">Inline link</TextLink><TextLink href="#atoms" kind="arrow">Next step</TextLink><TextLink href="#atoms" kind="external">View profile</TextLink></Row>
          <Row label="Controls">
            <Checkbox label="Wardrobe & costume" defaultChecked /><SampleSwitch />
            <span className="w-64"><Input placeholder="Name, craft or service" aria-label="Sample input" /></span>
          </Row>
          <Row label="Avatar"><Avatar name="Maya Chen" size="sm" /><Avatar name="Maya Chen" /><Avatar name="Maya Chen" size="lg" /></Row>
          <Row label="Text"><Price>$45 / hr</Price><Quote>“Good clothes, made to last.”</Quote></Row>
          <Row label="Divider"><span className="w-full"><Divider /></span></Row>
        </div>
      </Section>

      <Section id="molecules" title="Molecules" lead="Small groups of atoms with one job. Code: components/ds/molecules." figmaNode="63-1072">
        <div className="grid gap-6 lg:grid-cols-2">
          <Field label="Full name" hint="As you want clients to see it."><Input defaultValue="Maya Chen" /></Field>
          <div className="grid gap-2"><Alert title="Saved">It saves as you go.</Alert><Alert tone="warning" title="In review">We'll email you when it's approved.</Alert></div>
          <Completeness value={64} />
          <div className="grid gap-1">
            <StepNavItem state="done">1. About you</StepNavItem><StepNavItem state="current">2. Where & when</StepNavItem><StepNavItem>3. Your story</StepNavItem><StepNavItem state="locked">Private contact</StepNavItem>
          </div>
          <AddTile label="Upload a photo" hint="JPG, PNG or HEIC" />
          <div className="grid gap-6">
            <SectionHeading eyebrow="Services" title="How I can help" level="h2" />
            <div className="border-t border-line"><ServiceRow name="Closet organization" description="Edit and organise a wardrobe so getting dressed is easy." /></div>
          </div>
          <RateBlock price="$45 / hr" minimum="2-hour minimum" availability="Weekday mornings" earliest="Earliest start · Nov 18" />
        </div>
      </Section>

      <Section id="organisms" title="Organisms" lead="Self-contained sections. Code: components/ds/organisms; the header and footer are components/site." figmaNode="63-1085">
        <div className="grid gap-6">
          <ProfileResultCard href="/p/maya/" name="Maya Chen" service="Wardrobe & styling" line="Organizes closets and builds outfits from your own wardrobe."
            area="Eastside, Downtown" availability="Weekday mornings" rate="$45/hr" minimum="2-hour minimum" photo="img/people/maya.jpg" />
          <div className="grid gap-6 lg:grid-cols-2">
            <ServiceTile icon={Scissors} title="Alterations" description="Hems, fit and repairs for everyday clothes." href="/p/" />
            <ServiceTile icon={Camera} title="Photography" description="Portraits and small events." href="/p/" />
          </div>
          <div className="max-w-md">
            <AuthCard title="Create your account">
              <Field label="Email"><Input type="email" defaultValue="maya.chen@example.com" /></Field>
              <Button variant="primary" fullWidth>Create my profile</Button>
            </AuthCard>
          </div>
        </div>
      </Section>

      <Section id="templates" title="Templates and pages" lead="Page layouts, filled with real sample data. Open one in the current theme, or compare it in Figma." figmaNode="57-605">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <li key={t.title} className="grid gap-2 rounded-lg border border-line bg-surface p-4">
              <p className="font-display text-heading-md text-ink">{t.title}</p>
              <code className="text-caption text-ink-muted">{t.code}</code>
              <span className="flex flex-wrap gap-x-4">
                <TextLink href={t.href} kind="arrow">Open page</TextLink>
                <TextLink href={figma(t.node)} kind="external" target="_blank" rel="noreferrer">Figma</TextLink>
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
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
    <section id={id} aria-labelledby={`${id}-h`} className="grid gap-6 border-b border-line py-10">
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-line pb-5 md:grid-cols-6 md:items-center">
      <p className="text-label-md font-semibold text-ink-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-3 md:col-span-5">{children}</div>
    </div>
  );
}
