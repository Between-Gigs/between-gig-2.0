import { cx } from "@ds/components";
import { CircleCheck, Mail, MailOpen, MessageSquareWarning, Send, UserCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import type { ActivityEvent, ActivityKind } from "@/lib/data";

const meta: Record<ActivityKind, { verb: string; Icon: typeof Mail; tone: string }> = {
  joined_waitlist: { verb: "joined the call sheet", Icon: UserPlus, tone: "text-ink-muted" },
  invited: { verb: "was invited", Icon: Mail, tone: "text-ink-muted" },
  opened: { verb: "opened their invite", Icon: MailOpen, tone: "text-info" },
  registered: { verb: "created their account", Icon: UserCheck, tone: "text-ink-brand" },
  submitted: { verb: "submitted their profile", Icon: Send, tone: "text-info" },
  approved: { verb: "was approved", Icon: CircleCheck, tone: "text-success" },
  changes_requested: { verb: "was sent suggested edits", Icon: MessageSquareWarning, tone: "text-warning" },
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

/** "Recent activity": who did what, newest first. Status is always a word and an icon, never color alone. */
export function ActivityList({ events, className }: { events: ActivityEvent[]; className?: string }) {
  if (!events.length) return <p className="text-body-sm text-ink-muted">Nothing yet.</p>;
  return (
    <ol className={cx("grid", className)}>
      {events.map((e) => {
        const m = meta[e.kind];
        return (
          <li key={e.id} className="flex items-start gap-3 border-t border-line py-3 first:border-0 first:pt-0">
            <span className={cx("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-sunken", m.tone)}><m.Icon className="size-3.5" aria-hidden="true" /></span>
            <p className="min-w-0 flex-1 text-body-sm text-ink-muted">
              {e.personId ? <Link href={`/owners/people/${e.personId}/`} className="font-semibold text-ink hover:text-ink-brand hover:underline">{e.who}</Link> : <b className="font-semibold text-ink">{e.who}</b>}{" "}
              {m.verb}{e.by && <span className="text-ink-subtle"> · by {e.by}</span>}
            </p>
            <time dateTime={e.at} className="shrink-0 text-body-sm whitespace-nowrap text-ink-subtle tabular-nums">{ago(e.at)}</time>
          </li>
        );
      })}
    </ol>
  );
}

