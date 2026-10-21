"use client";
import { Button, Popover, Select, useToast } from "@ds/components";
import { Compass, FlaskConical, Inbox, RotateCcw, ShieldCheck, UserRound, UserRoundPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { data } from "@/lib/data";
import { DEMO_TOKENS } from "@/lib/data/seed";
import { useSession } from "@/lib/session";

/** One sample Gigster per status, so every status banner is one click away. */
const gigsters = [
  { value: "elena-petrova", label: "Elena · Draft" },
  { value: "imani-carter", label: "Imani · Submitted" },
  { value: "hana-kim", label: "Hana · Changes requested" },
  { value: "maya", label: "Maya · Approved" },
  { value: "grace-liu", label: "Grace · Registered, not started" },
];

/**
 * The demo switcher: a floating control (sample mode only) to jump between roles and reset the sample
 * data, so Justin and the client can click through every flow. Hidden with NEXT_PUBLIC_DEMO=off.
 */
export function DemoSwitcher() {
  const router = useRouter();
  const toast = useToast();
  const { session } = useSession();
  const [open, setOpen] = React.useState(false);
  const [gigster, setGigster] = React.useState(gigsters[0].value);
  const demo = data.demo;
  // QA scripts drive the same controls (scripts/qa). Sample mode only.
  React.useEffect(() => { if (demo) (window as unknown as { bgSample: typeof demo }).bgSample = demo; }, [demo]);
  if (!demo) return null;

  const role = !session ? "Visitor" : session.role === "owner" ? "Owner (sample)" : `Gigster · ${session.name || session.email}`;
  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <div data-demo-switcher="" className="fixed bottom-4 left-4 z-toast print:hidden">
      <Popover open={open} onOpenChange={setOpen} label="Demo switcher" title="Demo switcher" width="md"
        trigger={<Button variant="strong" size="sm" iconStart={<FlaskConical />} className="shadow-lg">Demo</Button>}>
        <p className="text-body-sm text-ink-muted">Sample mode: everything stays in this browser. Now viewing as <b className="text-ink">{role}</b>.</p>
        <div className="grid gap-2">
          <Button size="sm" fullWidth iconStart={<UserRound />} className="justify-start"
            onClick={async () => { await data.auth.signOut(); go("/preview/"); }}>Visitor (signed out)</Button>
          <Button size="sm" fullWidth iconStart={<UserRoundPlus />} className="justify-start"
            onClick={async () => { const r = await demo.signInAs("invited"); go(`/join/?invite=${r.inviteToken}`); }}>Invited Gigster (opens the invite link)</Button>
          <div className="grid gap-2 rounded-md border border-line p-2">
            <Select aria-label="Sample Gigster" size="sm" value={gigster} onValueChange={setGigster} options={gigsters} />
            <Button size="sm" fullWidth iconStart={<UserRound />} className="justify-start"
              onClick={async () => { await demo.signInAs("gigster", gigster); go("/profile/"); }}>Sign in as this Gigster</Button>
          </div>
          <Button size="sm" fullWidth iconStart={<Users />} className="justify-start"
            onClick={async () => { await demo.signInAs("owner"); go("/owners/"); }}>Owner (sample): dashboard</Button>
        </div>
        <div className="grid gap-1 border-t border-line pt-3">
          <p className="text-label-sm text-ink-subtle">Invite link states</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-body-sm">
            {(["valid", "used", "expired", "unknown"] as const).map((k) => (
              <li key={k}><Link className="inline-flex min-h-6 items-center text-link underline underline-offset-2" href={`/join/?invite=${DEMO_TOKENS[k]}`} onClick={() => setOpen(false)}>{k}</Link></li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <Button size="sm" variant="ghost" iconStart={<Compass />} onClick={() => go("/preview/")}>Preview guide</Button>
          <Button size="sm" variant="ghost" iconStart={<Inbox />} onClick={() => go("/emails/")}>Emails & outbox</Button>
          <Button size="sm" variant="ghost" iconStart={<RotateCcw />}
            onClick={async () => { await demo.reset(); setOpen(false); toast({ message: "Sample data reset", tone: "success" }); router.push("/preview/"); }}>Reset sample data</Button>
        </div>
        <p className="flex items-center gap-1.5 text-caption text-ink-subtle"><ShieldCheck className="size-3.5" aria-hidden="true" />Not part of the product. Hidden in production builds.</p>
      </Popover>
    </div>
  );
}
