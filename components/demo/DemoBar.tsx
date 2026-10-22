"use client";
import { Button, cx, useToast } from "@ds/components";
import { Eye, RotateCcw, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { data, type Person } from "@/lib/data";
import { demoActive, demoStepFor, demoSteps, onDemoChange, setDemoActive } from "@/lib/demo-flow";
import { useSession } from "@/lib/session";

/**
 * The demo's guide: a slim bar pinned to the bottom of every page in the flow, showing the four steps and where
 * they are. At the last step it can publish their profile (demo only) so they see the public page.
 */
export function DemoBar() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { session } = useSession();
  const [on, setOn] = React.useState(false);
  const [person, setPerson] = React.useState<Person | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { setOn(demoActive()); return onDemoChange(() => setOn(demoActive())); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    if (!on || !session?.personId) { setPerson(null); return; } // eslint-disable-line react-hooks/set-state-in-effect
    void data.people.get(session.personId).then((s) => setPerson(s?.person ?? null));
  }, [on, session?.personId, pathname]);

  const step = demoStepFor(pathname);
  const visible = on && step >= 0;
  // Room at the bottom of the page, so the bar never covers the last lines or the footer.
  React.useEffect(() => {
    if (!visible) return;
    document.body.classList.add("pb-24");
    return () => document.body.classList.remove("pb-24");
  }, [visible]);
  if (!visible) return null;

  const publish = async () => {
    if (!person) return;
    setBusy(true);
    try {
      await data.owners.approve(person.id);
      toast({ message: "Published. This is what clients see.", tone: "success" });
      router.push(`/p/${person.slug}/`);
    } catch { toast({ message: "Couldn't publish. Submit your profile first.", tone: "danger" }); }
    setBusy(false);
  };

  return (
    <div role="region" aria-label="Demo progress" className="fixed inset-x-0 bottom-0 z-sticky flex justify-center px-3 pb-3">
      <div data-theme="dark" className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface-brand px-4 py-2.5 text-ink shadow-lg">
        <span className="text-label-sm tracking-wider text-ink-brand uppercase">Demo</span>
        <ol className="flex items-center gap-1.5" aria-label="Steps">
          {demoSteps.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined} className={cx("flex items-center gap-1.5 text-label-sm", i === step ? "text-ink" : i < step ? "text-ink-muted" : "text-ink-subtle")}>
              <span aria-hidden="true" className={cx("grid size-5 place-items-center rounded-full text-label-sm tabular-nums", i === step ? "bg-action text-on-action" : i < step ? "bg-surface-selected text-ink-brand" : "border border-line")}>{i + 1}</span>
              <span className={cx(i !== step && "max-md:sr-only")}>{s}</span>
            </li>
          ))}
        </ol>
        <span className="flex items-center gap-1">
          {step === 3 && person?.status === "submitted" && (
            <Button size="sm" variant="primary" iconStart={<Eye />} loading={busy} onClick={() => void publish()}>Publish it (demo)</Button>
          )}
          {step === 3 && person?.status === "approved" && !pathname.startsWith("/p/") && (
            <Button size="sm" variant="primary" iconStart={<Eye />} onClick={() => router.push(`/p/${person.slug}/`)}>See it as clients do</Button>
          )}
          <Button size="sm" variant="ghost" iconStart={<RotateCcw />} onClick={() => router.push("/demo/")}>Restart</Button>
          <Button size="sm" variant="ghost" iconStart={<X />} onClick={() => setDemoActive(false)} aria-label="Hide the demo bar">Hide</Button>
        </span>
      </div>
    </div>
  );
}
