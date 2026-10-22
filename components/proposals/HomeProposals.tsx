"use client";
import { Button, SegmentedControl, Select } from "@ds/components";
import { startPageTransition } from "@ds/motion";
import { Briefcase, Compass, Lightbulb, User } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useSession } from "@/lib/session";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { GigsterHome, gigsterNotes } from "./GigsterHome";
import { OwnerHome, ownerNotes } from "./OwnerHome";
import { NotesContext, NotesDrawer, type Note } from "./ProposalNote";
import { VisitorHome, visitorNotes } from "./VisitorHome";

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

const principles: [string, string][] = [
  ["One job per visitor", "Clients come to hire, Gigsters to manage their work, owners to review. Each home answers its visitor's first question before anything else."],
  ["Same voice, new jobs", "Approved lines carry over (“Extraordinary talent. Everyday solutions.”, “Production comes first.”). Nothing is invented about the company."],
  ["Built from what exists", "Every block reuses a page or a data seam from Milestones 2 to 4, so this is a short build, not a new product."],
];

const notesFor: Record<View, Note[]> = { visitor: visitorNotes, gigster: gigsterNotes, owner: ownerNotes };

/**
 * /proposals/home (Milestone 5b): what the home page becomes once the platform opens, for each kind of
 * visitor. Each state renders clean, as it would ship; a compact bar switches state, and the reasoning sits
 * behind "Show design notes" (numbered pins beside each section, all notes in a side drawer).
 * Not live: "/" stays the call sheet.
 */
export function HomeProposals() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSession();
  const initial = (views as string[]).includes(params.get("view") ?? "") ? (params.get("view") as View) : "visitor";
  const [view, setView] = React.useState<View>(initial);
  const [notes, setNotes] = React.useState(false);
  const [drawer, setDrawer] = React.useState<{ open: boolean; focus: number | null }>({ open: false, focus: null });
  const [gigster, setGigster] = React.useState(session?.role === "gigster" && session.personId ? session.personId : "maya");
  const stage = React.useRef<HTMLDivElement>(null);

  const choose = (v: string) => {
    const next = v as View;
    startPageTransition(() => setView(next), { effect: "shift", direction: views.indexOf(next) < views.indexOf(view) ? "back" : "forward", target: stage.current });
    router.replace(`${pathname}?view=${next}`, { scroll: false });
  };
  const ctx = React.useMemo(() => ({ on: notes, notes: notesFor[view], open: (n: number) => setDrawer({ open: true, focus: n }) }), [notes, view]);

  return (
    <Page bare>
      <div className="z-sticky border-b border-line bg-bg/90 backdrop-blur-md sm:sticky sm:top-16">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
          <div className="grid min-w-0">
            <span className="text-label-sm text-ink-brand">Proposal · not live</span>
            <h1 id="proposal-h" className="truncate text-label-md text-ink">Home page, once we open: {about[view].title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <SegmentedControl label="View the home page as" size="sm" value={view} onChange={choose}
              options={[{ value: "visitor", label: "Signed out", icon: <Compass /> }, { value: "gigster", label: "Gigster", icon: <User /> }, { value: "owner", label: "Owner", icon: <Briefcase /> }]} />
            {view === "gigster" && <Select aria-label="Sample Gigster" size="sm" className="w-56" value={gigster} onValueChange={setGigster} options={gigsters} />}
            <Button size="sm" variant={notes ? "primary" : "secondary"} aria-pressed={notes} iconStart={<Lightbulb />} onClick={() => setNotes((x) => !x)}>
              {notes ? "Hide design notes" : "Show design notes"}
            </Button>
            {notes && <Button size="sm" variant="ghost" onClick={() => setDrawer({ open: true, focus: null })}>All {notesFor[view].length} notes</Button>}
            <span className="hidden md:contents"><ButtonLink href="/" size="sm" variant="ghost">See today's home</ButtonLink></span>
          </div>
        </div>
      </div>

      <NotesContext.Provider value={ctx}>
        <div ref={stage} className="vt-page mx-auto w-full max-w-7xl px-4 pt-6 pb-20 sm:px-6 sm:pt-8">
          {view === "visitor" && <VisitorHome />}
          {view === "gigster" && <GigsterHome key={gigster} personId={gigster} />}
          {view === "owner" && <OwnerHome />}
        </div>
      </NotesContext.Provider>

      <NotesDrawer open={drawer.open} focus={drawer.focus} onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        title={about[view].title} summary={about[view].summary} principles={principles} notes={notesFor[view]} />
    </Page>
  );
}
