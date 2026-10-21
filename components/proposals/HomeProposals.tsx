"use client";
import { Badge, PageHeader, SegmentedControl, Select, Switch } from "@ds/components";
import { startPageTransition } from "@ds/motion";
import { Briefcase, Compass, User } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useSession } from "@/lib/session";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { GigsterHome } from "./GigsterHome";
import { OwnerHome } from "./OwnerHome";
import { NotesContext } from "./ProposalNote";
import { VisitorHome } from "./VisitorHome";

type View = "visitor" | "gigster" | "owner";
const views: View[] = ["visitor", "gigster", "owner"];

const gigsters = [
  { value: "maya", label: "Maya · Approved" },
  { value: "elena-petrova", label: "Elena · Draft" },
  { value: "imani-carter", label: "Imani · Submitted" },
  { value: "hana-kim", label: "Hana · Changes requested" },
  { value: "grace-liu", label: "Grace · Not started" },
];

const about: Record<View, { title: string; summary: string }> = {
  visitor: { title: "Signed out", summary: "Clients looking for help, and professionals deciding whether to join. Search first, two equal doors, real approved faces, the Storyboard, honest trust." },
  gigster: { title: "Signed in · Gigster", summary: "Where they stand, the one next step, availability in one tap, and the space where booking requests will arrive." },
  owner: { title: "Signed in · Owner", summary: "Is anyone waiting on us? The oldest review one click away, four plain numbers, and a hand-off to the dashboard." },
};

/**
 * /proposals/home (Milestone 5b): what the home page becomes once the platform opens, for each kind of
 * visitor, as designed proposals with the reasoning beside each section. Not live: "/" stays the call sheet.
 */
export function HomeProposals() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSession();
  const initial = (views as string[]).includes(params.get("view") ?? "") ? (params.get("view") as View) : "visitor";
  const [view, setView] = React.useState<View>(initial);
  const [notes, setNotes] = React.useState(true);
  const [gigster, setGigster] = React.useState(session?.role === "gigster" && session.personId ? session.personId : "maya");
  const stage = React.useRef<HTMLDivElement>(null);

  const choose = (v: string) => {
    const next = v as View;
    startPageTransition(() => setView(next), { effect: "shift", direction: views.indexOf(next) < views.indexOf(view) ? "back" : "forward", target: stage.current });
    router.replace(`${pathname}?view=${next}`, { scroll: false });
  };

  return (
    <Page>
      <PageHeader eyebrow="Milestone 5b · Proposal" title="The home page, once we open" size="studio"
        description="Today's home is the call sheet: one message, one button. When clients can book, the front door has to serve three people. Here is a proposal for each, with the reasoning beside every section."
        actions={<ButtonLink href="/">See today's home</ButtonLink>} />

      <ul className="mt-8 grid gap-3 md:grid-cols-3">
        {[
          ["One job per visitor", "Clients come to hire, Gigsters to manage their work, owners to review. Each home answers its visitor's first question before anything else."],
          ["Same voice, new jobs", "Approved lines carry over (“Extraordinary talent. Everyday solutions.”, “Production comes first.”). Nothing is invented about the company."],
          ["Built from what exists", "Every block reuses a page or a data seam from Milestones 2 to 4, so this is a short build, not a new product."],
        ].map(([t, d]) => (
          <li key={t} className="rounded-xl border border-line bg-surface p-4"><b className="block text-label-md text-ink">{t}</b><span className="text-body-sm text-ink-muted">{d}</span></li>
        ))}
      </ul>

      <div className="sticky top-16 z-sticky -mx-4 mt-8 flex flex-wrap items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:px-3">
        <SegmentedControl label="View the home page as" value={view} onChange={choose}
          options={[{ value: "visitor", label: "Signed out", icon: <Compass /> }, { value: "gigster", label: "Gigster", icon: <User /> }, { value: "owner", label: "Owner", icon: <Briefcase /> }]} />
        {view === "gigster" && <Select aria-label="Sample Gigster" size="sm" className="w-60" value={gigster} onValueChange={setGigster} options={gigsters} />}
        <span className="ml-auto"><Switch checked={notes} onChange={setNotes} label="Design notes" /></span>
      </div>

      <section aria-labelledby="proposal-h" className="mt-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 id="proposal-h" className="font-display text-heading-lg text-ink">{about[view].title}</h2>
          <Badge tone="info" size="sm">Proposal · not live</Badge>
        </div>
        <p className="mb-6 max-w-prose text-body-md text-ink-muted">{about[view].summary}</p>
        <NotesContext.Provider value={notes}>
          <div ref={stage} className="vt-page rounded-2xl border border-line bg-bg p-3 sm:p-6">
            {view === "visitor" && <VisitorHome />}
            {view === "gigster" && <GigsterHome key={gigster} personId={gigster} />}
            {view === "owner" && <OwnerHome />}
          </div>
        </NotesContext.Provider>
      </section>
    </Page>
  );
}
