"use client";
import { Banner, Button, Field, Input, Modal, SegmentedControl, Select, Textarea, cx } from "@ds/components";
import { Inbox, LayoutGrid, List, Sparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { flushSync } from "react-dom";
import { data } from "@/lib/data";
import { asset } from "@/lib/site";
import { plans, scenePages, type PlanField } from "@/lib/storyboard";
import { Page } from "@/components/site/Page";
import { StoryBook, type StoryBookHandle } from "@/components/storyboard/StoryBook";

type Kind = keyof typeof plans;

/** Animates a list change: each item has its own view-transition name, so cards glide to their new places. */
function reflow(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (!doc.startViewTransition || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { update(); return; }
  doc.startViewTransition(() => flushSync(update));
}

/**
 * /storyboard. The approved Storyboard, rebuilt on the design system: the sketchbook with its curling page
 * turn (components/storyboard), the credits, the catalog of commissions, and the two forms.
 */
export function Storyboard() {
  const [planner, setPlanner] = React.useState<Kind | null>(null);
  const bookRef = React.useRef<StoryBookHandle>(null);
  const top = React.useRef<HTMLDivElement>(null);

  const openScene = (index: number) => {
    top.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => bookRef.current?.goTo(index), 350);
  };

  return (
    <Page bare>
      <div ref={top} className="scroll-mt-16" />
      <StoryBook ref={bookRef} onPlan={setPlanner} onScrollOn={() => document.getElementById("credits")?.scrollIntoView({ behavior: "smooth", block: "start" })} />

      {/* The credits keep rolling */}
      <section id="credits" aria-labelledby="credits-h" className="mx-auto grid max-w-3xl scroll-mt-20 gap-5 border-t border-line px-4 py-20 text-center sm:px-6">
        <h2 id="credits-h" className="text-eyebrow text-ink-brand uppercase">The credits keep rolling</h2>
        <p className="font-serif text-editorial-lg text-ink">Between Gigs gives everyday people and businesses access to the remarkable range of entertainment professionals between productions. A family can hire a scenic carpenter to reinvent a room. A bakery can bring in a food stylist and editor. A school can build a fundraiser with a producer and sound crew. Production designers, grips, writers, actors, builders, assistants and animal handlers can be booked for one afternoon or an entire season. You describe the outcome; we help cast one person or the right crew.</p>
        <p className="text-body-lg text-ink-muted italic">Your next useful skill may be the one nobody has thought to cast yet.</p>
      </section>

      <Catalog onOpen={openScene} />

      {/* Mounted per opening, so every form starts empty. */}
      {planner && <Planner key={planner} kind={planner} onClose={() => setPlanner(null)} />}
    </Page>
  );
}

function Catalog({ onOpen }: { onOpen: (index: number) => void }) {
  const [talent, setTalent] = React.useState("all");
  const [customer, setCustomer] = React.useState("all");
  const [order, setOrder] = React.useState("book");
  const [view, setView] = React.useState("gallery");
  const items = scenePages
    .map((s, index) => ({ ...s, index }))
    .filter((s) => s.type !== "cover")
    .filter((s) => talent === "all" || s.type === talent)
    .filter((s) => customer === "all" || s.customer === customer)
    .sort((a, b) => order === "title" ? a.title.localeCompare(b.title) : order === "talent" ? a.place.localeCompare(b.place) : a.index - b.index);
  const set = (fn: (v: string) => void) => (v: string) => reflow(() => fn(v));

  return (
    <section id="plates" aria-labelledby="plates-h" className="border-t border-line bg-surface-sunken py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-eyebrow text-ink-brand uppercase">Browse the commissions</p>
        <h2 id="plates-h" className="mt-2 font-display text-display-sm text-ink">Every page in the book</h2>
        <p className="mt-2 text-body-md text-ink-muted">Choose a commission to open it in the book, or narrow the possibilities below.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Select aria-label="Talent" size="sm" className="w-52" value={talent} onValueChange={set(setTalent)} options={[{ value: "all", label: "Everyone" }, { value: "solo", label: "One talented person" }, { value: "crew", label: "Crews and teams" }]} />
          <Select aria-label="Customer" size="sm" className="w-56" value={customer} onValueChange={set(setCustomer)} options={[{ value: "all", label: "Individuals + businesses" }, { value: "individual", label: "Individuals" }, { value: "business", label: "Businesses + organizations" }]} />
          <Select aria-label="Order" size="sm" className="w-40" value={order} onValueChange={set(setOrder)} options={[{ value: "book", label: "Book order" }, { value: "title", label: "By need" }, { value: "talent", label: "By talent" }]} />
          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-data-sm text-ink-subtle" aria-live="polite">{items.length} commissions</span>
            <SegmentedControl label="Index view" size="sm" value={view} onChange={set(setView)} options={[{ value: "list", label: "List", icon: <List /> }, { value: "gallery", label: "Gallery", icon: <LayoutGrid /> }]} />
          </div>
        </div>
        <ol className={cx("mt-6 grid gap-3", view === "gallery" && "sm:grid-cols-2 lg:grid-cols-3")}>
          {items.map((s) => (
            <li key={s.file} style={{ viewTransitionName: `plate-${s.file.replace(/\W/g, "")}` }}>
              <button type="button" onClick={() => onOpen(s.index)}
                className={cx("group flex w-full gap-4 rounded-2xl border border-line bg-surface p-3 text-left transition duration-base hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md",
                  view === "gallery" ? "h-full flex-col" : "items-center")}>
                <img src={asset(`art/storyboard/${s.file}`)} alt="" loading="lazy" className={cx("shrink-0 rounded-xl object-cover", view === "gallery" ? "aspect-3/2 w-full" : "aspect-3/2 w-28 sm:w-36")} />
                <span className="grid min-w-0 gap-1">
                  <span className="font-mono text-data-sm text-ink-subtle">Page {s.index + 1}</span>
                  <span className="font-display text-heading-md text-ink group-hover:text-ink-brand">{s.title}</span>
                  <span className="text-label-sm text-ink-brand">{s.place}</span>
                  <span className={cx("text-body-sm text-ink-muted", view === "list" && "hidden sm:block")}>{s.story}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Planner({ kind, onClose }: { kind: Kind | null; onClose: () => void }) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [state, setState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const plan = kind ? plans[kind] : null;

  const check = (f: PlanField, v = "") => {
    if (f.optional && !v.trim()) return undefined;
    if (!v.trim()) return f.control === "select" ? "Choose one." : "Fill this in to continue.";
    if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Enter an email address, like name@example.com.";
    return undefined;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !kind) return;
    const next: Record<string, string> = {};
    for (const f of plan.fields) { const m = check(f, values[f.name]); if (m) next[f.name] = m; }
    setErrors(next);
    if (Object.keys(next).length) { document.getElementById(`plan-${Object.keys(next)[0]}`)?.focus(); return; }
    setState("saving");
    try { await data.funnel.submitSketch(kind, values); setState("saved"); }
    catch { setState("error"); }
  };

  return (
    <Modal open={!!plan} onClose={onClose} size="lg" title={plan ? (state === "saved" ? plan.saved : plan.title) : ""}
      description={plan && state !== "saved" ? <><span className="block text-eyebrow text-ink-brand uppercase">{plan.eyebrow}</span>{plan.intro}</> : undefined}>
      {plan && state === "saved" ? (
        <div className="grid justify-items-center gap-4 py-6 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-action text-on-action shadow-md"><Sparkles className="size-8" aria-hidden="true" /></span>
          <p role="status" className="max-w-md text-body-lg text-ink-muted">Thank you for your interest. Between Gigs is coming soon. We've saved your submission and will email you when we're ready.</p>
          {data.kind === "sample" && <p className="text-caption text-ink-subtle">Sample mode: the confirmation is in the <Link href="/emails/" className="inline-flex items-center gap-1 text-link underline underline-offset-2"><Inbox className="size-3.5" aria-hidden="true" />sample outbox</Link>.</p>}
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      ) : plan && (
        <form noValidate onSubmit={submit} aria-busy={state === "saving" || undefined} className="grid gap-4 sm:grid-cols-2">
          {state === "error" && <Banner tone="danger" className="sm:col-span-2" title="We could not save that yet">Your entries are still here—please try again.</Banner>}
          {plan.fields.map((f) => {
            const v = values[f.name] ?? "";
            const set = (x: string) => { setValues((o) => ({ ...o, [f.name]: x })); setErrors((o) => { const c = { ...o }; delete c[f.name]; return c; }); };
            return (
              <Field key={f.name} label={f.label} optional={f.optional} error={errors[f.name]} className={f.wide ? "sm:col-span-2" : undefined}>
                {f.control === "textarea" ? <Textarea id={`plan-${f.name}`} rows={3} maxLength={f.max} placeholder={f.placeholder} value={v} onChange={(e) => set(e.target.value)} />
                  : f.control === "select" ? <Select id={`plan-${f.name}`} placeholder="Choose one" value={v || undefined} onValueChange={set} options={(f.options ?? []).map((o) => ({ value: o, label: o }))} />
                  : <Input id={`plan-${f.name}`} type={f.type ?? "text"} autoComplete={f.autocomplete} maxLength={f.max} placeholder={f.placeholder} value={v} onChange={(e) => set(e.target.value)} />}
              </Field>
            );
          })}
          <div className="grid gap-3 sm:col-span-2">
            <Button type="submit" variant="primary" size="lg" loading={state === "saving"}>{plan.button}</Button>
            <p className="text-body-sm text-ink-muted">This is an early-interest form, not a booking or published profile. We may follow up about your submission. Read our <Link className="text-link underline underline-offset-2" href="/privacy/">Privacy Policy</Link> and <Link className="text-link underline underline-offset-2" href="/terms/">Terms of Use</Link>.</p>
          </div>
        </form>
      )}
    </Modal>
  );
}
