import { cx } from "@ds/components";
import { CircleCheck, Mail, MailOpen, MessageSquareWarning, Send, UserCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import type { ActivityEvent, ActivityKind } from "@/lib/data";

/** Each kind of event has its own icon and soft tone, so a glance tells them apart. Never colour alone: the verb says it. */
const meta: Record<ActivityKind, { verb: string; Icon: typeof Mail; tone: string }> = {
  joined_waitlist: { verb: "joined the call sheet", Icon: UserPlus, tone: "bg-surface-sunken text-ink-muted" },
  invited: { verb: "was invited", Icon: Mail, tone: "bg-surface-sunken text-ink-muted" },
  opened: { verb: "opened their invite", Icon: MailOpen, tone: "bg-info-soft text-info" },
  registered: { verb: "created their account", Icon: UserCheck, tone: "bg-surface-selected text-ink-brand" },
  submitted: { verb: "submitted their profile", Icon: Send, tone: "bg-info-soft text-info" },
  approved: { verb: "was approved", Icon: CircleCheck, tone: "bg-success-soft text-success" },
  changes_requested: { verb: "was sent suggested edits", Icon: MessageSquareWarning, tone: "bg-warning-soft text-warning" },
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
export function ActivityList({ events, className, onOpen }: { events: ActivityEvent[]; className?: string; /** Opens the person in place instead of going to their page. */ onOpen?: (personId: string) => void }) {
  if (!events.length) return <p className="px-5 py-4 text-body-sm text-ink-muted">Nothing yet. Invites, sign-ups and reviews show up here.</p>;
  const days: [string, ActivityEvent[]][] = [];
  for (const e of events) {
    const label = dayLabel(e.at);
    const last = days[days.length - 1];
    if (last && last[0] === label) last[1].push(e); else days.push([label, [e]]);
  }
  return (
    <div className={cx("grid", className)}>
      {days.map(([label, list]) => (
        <section key={label} aria-label={label} className="border-t border-line first:border-t-0">
          <h3 className="bg-surface-sunken/50 px-5 py-1.5 text-label-sm text-ink-subtle">{label}</h3>
          <ol>
            {list.map((e) => {
              const m = meta[e.kind];
              return (
                <li key={e.id} className="flex min-h-12 items-center gap-3 px-5 py-2">
                  <span className={cx("grid size-7 shrink-0 place-items-center rounded-md", m.tone)}><m.Icon className="size-3.5" aria-hidden="true" /></span>
                  <p className="min-w-0 flex-1 truncate text-body-sm text-ink-muted">
                    {e.personId && onOpen ? <button type="button" onClick={() => onOpen(e.personId!)} className="inline-flex min-h-6 items-center font-semibold text-ink hover:text-ink-brand">{e.who}</button>
                      : e.personId ? <Link href={`/owners/people/${e.personId}/`} className="font-semibold text-ink hover:text-ink-brand">{e.who}</Link> : <b className="font-semibold text-ink">{e.who}</b>}{" "}
                    {m.verb}{e.by && <span className="text-ink-subtle"> · {e.by.replace(/\s*\(sample\)$/, "")}</span>}
                  </p>
                  <time dateTime={e.at} className="shrink-0 text-body-sm whitespace-nowrap text-ink-subtle tabular-nums">{clock(e.at)}</time>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
