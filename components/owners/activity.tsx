import { useLook } from "@/components/site/LookSync";
import { cx } from "@ds/components";
import Link from "next/link";
import type { ActivityEvent, ActivityKind } from "@/lib/data";
import { markArea } from "@/lib/split-area";
import { CircleCheck, Eye, Mail, PencilLine, Send, Ticket, UserPlus, type LucideIcon } from "lucide-react";
import { Icon3D } from "@/components/ui/Icon3D";
import type { Icon3DName } from "@/lib/icons3d";
import { PersonPhoto } from "@/components/people/PersonPhoto";

markArea("bg-split:dashboard");

/** Each kind of event has its own line icon (shown when the person has no photo yet). Never the icon alone: the verb says it. */
const meta: Record<ActivityKind, { verb: string; icon: LucideIcon; art: Icon3DName; tone: string }> = {
  joined_waitlist: { verb: "joined the call sheet", icon: Ticket, art: "admission_tickets", tone: "bg-tint-sand" },
  invited: { verb: "was invited", icon: Mail, art: "envelope", tone: "bg-tint-sage" },
  opened: { verb: "opened their invite", icon: Eye, art: "eyes", tone: "bg-tint-sky" },
  registered: { verb: "created their account", icon: UserPlus, art: "waving_hand", tone: "bg-tint-sky" },
  submitted: { verb: "submitted their profile", icon: Send, art: "envelope", tone: "bg-tint-peach" },
  approved: { verb: "was approved", icon: CircleCheck, art: "check_mark_button", tone: "bg-tint-mint-soft" },
  changes_requested: { verb: "was sent suggested edits", icon: PencilLine, art: "memo", tone: "bg-tint-butter" },
};

export const ago = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : d < 30 ? `${d} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** "Today", "Yesterday", or "Tuesday, Oct 20": the heading for a day of activity. */
function dayLabel(iso: string) {
  const d = new Date(iso), today = new Date();
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** "Recent activity": who did what, newest first, grouped under a heading per day with the time on each line. */
export function ActivityList({ events, className, onOpen, photoFor, phoneLimit }: {
  events: ActivityEvent[]; className?: string; /** Opens the person in place instead of going to their page. */ onOpen?: (personId: string) => void;
  /** The person's photo, shown square beside the line; without one, the event's line icon. */ photoFor?: (personId: string) => string | undefined;
  /** Below lg, show only this many events (the caller offers "Show all"), so the phone page stays short. */ phoneLimit?: number;
}) {
  const look = useLook();
  const brand = look !== "swiss";
  if (!events.length) return <p className="py-4 text-body-sm text-ink-muted">Nothing yet. Invites, sign-ups and reviews show up here.</p>;
  const days: [string, ActivityEvent[]][] = [];
  for (const e of events) {
    const label = dayLabel(e.at);
    const last = days[days.length - 1];
    if (last && last[0] === label) last[1].push(e); else days.push([label, [e]]);
  }
  let n = 0;
  const cut = (i: number) => phoneLimit !== undefined && i >= phoneLimit && "max-lg:hidden";
  if (brand) return (
    <div className={cx("grid gap-1 px-2 pb-2 sm:px-3", className)}>
      {days.map(([label, list]) => (
        <section key={label} aria-label={label} data-fit-group="" className={cx(cut(n) || undefined)}>
          <h3 className="px-3 pt-2 pb-1 text-label-sm text-ink-subtle">{label}</h3>
          <ol>
            {list.map((e) => {
              const m = meta[e.kind];
              const i = n++;
              return (
                <li key={e.id} data-fit="" className={cx("relative flex min-h-16 items-start gap-3 px-3 py-2.5 before:absolute before:inset-x-3 before:top-0 before:border-t-2 before:border-dashed before:border-line first:before:hidden", cut(i))}>
                  {look === "modern" ? <PersonPhoto id={e.personId ?? e.id} name={e.who} src={e.personId ? photoFor?.(e.personId) : undefined} className="size-9 shrink-0 rounded-full" /> :
                    <span className={cx("grid size-11 shrink-0 place-items-center rounded-md", m.tone)}><Icon3D name={m.art} className="size-7" /></span>}
                  <p className="min-w-0 flex-1 text-body-md text-ink-muted">
                    {e.personId && onOpen ? <button type="button" onClick={() => onOpen(e.personId!)} className="inline-flex min-h-6 items-center font-bold text-ink hover:text-ink-brand hover:underline">{e.who}</button>
                      : e.personId ? <Link href={`/owners/people/${e.personId}/`} className="font-bold text-ink hover:text-ink-brand hover:underline">{e.who}</Link> : <b className="font-bold text-ink">{e.who}</b>}{" "}
                    {m.verb}{e.by && <span className="text-ink-subtle"> · {e.by.replace(/\s*\(sample\)$/, "")}</span>}
                    <time dateTime={e.at} className="block text-body-sm font-semibold text-ink-subtle tabular-nums">{clock(e.at)}</time>
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
  return (
    <div className={cx("grid gap-1 pb-2", className)}>
      {days.map(([label, list]) => (
        <section key={label} aria-label={label} data-fit-group="" className={cx(cut(n) || undefined)}>
          <h3 className="border-b-2 border-line-strong pt-3 pb-1.5 text-label-sm font-bold tracking-widest text-ink-muted uppercase">{label}</h3>
          <ol>
            {list.map((e) => {
              const i = n++;
              const m = meta[e.kind];
              const photo = e.personId ? photoFor?.(e.personId) : undefined;
              return (
                <li key={e.id} data-fit="" className={cx("flex min-h-18 items-start gap-3.5 border-b border-line py-3", cut(i))}>
                  {photo ? <PersonPhoto id={e.personId!} name={e.who} src={photo} alt="" className="size-12 shrink-0" />
                    : <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center bg-surface-sunken text-ink"><m.icon className="size-5" strokeWidth={1.75} /></span>}
                  <p className="min-w-0 flex-1 text-body-md text-ink-muted">
                    {e.personId && onOpen ? <button type="button" onClick={() => onOpen(e.personId!)} className="inline-flex min-h-6 items-center font-display font-extrabold text-ink hover:text-ink-brand hover:underline">{e.who}</button>
                      : e.personId ? <Link href={`/owners/people/${e.personId}/`} className="font-display font-extrabold text-ink hover:text-ink-brand hover:underline">{e.who}</Link> : <b className="font-display font-extrabold text-ink">{e.who}</b>}{" "}
                    {m.verb}{e.by && <span className="text-ink-muted"> · {e.by.replace(/\s*\(sample\)$/, "")}</span>}
                    <time dateTime={e.at} className="mt-0.5 block text-body-sm font-semibold text-ink-muted tabular-nums">{clock(e.at)}</time>
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
