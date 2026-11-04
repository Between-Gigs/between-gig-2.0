import { cx } from "@ds/components";
import Link from "next/link";
import type { ActivityEvent, ActivityKind } from "@/lib/data";
import { markArea } from "@/lib/split-area";
import { Icon3D } from "@/components/ui/Icon3D";
import type { Icon3DName } from "@/lib/icons3d";

markArea("bg-split:dashboard");

/** Each kind of event has its own 3D icon on its own pastel tile, so a glance tells them apart. Never colour alone: the verb says it. */
const meta: Record<ActivityKind, { verb: string; icon: Icon3DName; tone: string }> = {
  joined_waitlist: { verb: "joined the call sheet", icon: "admission_tickets", tone: "bg-tint-sand" },
  invited: { verb: "was invited", icon: "envelope", tone: "bg-tint-sage" },
  opened: { verb: "opened their invite", icon: "eyes", tone: "bg-tint-sky" },
  registered: { verb: "created their account", icon: "waving_hand", tone: "bg-tint-sky" },
  submitted: { verb: "submitted their profile", icon: "envelope", tone: "bg-tint-peach" },
  approved: { verb: "was approved", icon: "check_mark_button", tone: "bg-tint-mint" },
  changes_requested: { verb: "was sent suggested edits", icon: "memo", tone: "bg-tint-butter" },
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
    <div className={cx("grid gap-1 px-2 pb-2 sm:px-3", className)}>
      {days.map(([label, list]) => (
        <section key={label} aria-label={label} data-fit-group="">
          <h3 className="px-3 pt-2 pb-1 text-label-sm text-ink-subtle">{label}</h3>
          <ol>
            {list.map((e) => {
              const m = meta[e.kind];
              return (
                <li key={e.id} data-fit="" className="relative flex min-h-16 items-start gap-3 px-3 py-2.5 before:absolute before:inset-x-3 before:top-0 before:border-t-2 before:border-dashed before:border-line first:before:hidden">
                  <span className={cx("grid size-11 shrink-0 place-items-center rounded-md", m.tone)}><Icon3D name={m.icon} className="size-7" /></span>
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
}
