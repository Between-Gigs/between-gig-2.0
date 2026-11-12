"use client";
import { Button, SegmentedControl } from "@ds/components";
import { ArrowRight, Clock3, Mail } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import type { DashboardSummary, PersonSummary, WaitlistRow } from "@/lib/data";
import { waitlistCategoryLabel } from "@/lib/data/taxonomy";
import { ActivityList, ago } from "./activity";
import type { DashboardView } from "./OwnerDashboard";
import { FunnelCompact } from "./Funnel";
import { OwnerAvatar } from "./kit";
import { shortDate } from "./format";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

const sortChoices = [
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest" },
  { value: "department", label: "Department" },
] as const;
export type ModernSort = (typeof sortChoices)[number]["value"];
export function sortReviewers(rows: PersonSummary[], sort: ModernSort) {
  if (sort === "oldest") return rows;
  const ordered = [...rows];
  if (sort === "newest") return ordered.reverse();
  return ordered.sort(
    (a, b) =>
      (a.fields?.position || "").localeCompare(b.fields?.position || "") || a.person.name.localeCompare(b.person.name),
  );
}
const daysWaiting = (date?: string) => (date ? Math.max(0, Math.floor((Date.now() - Date.parse(date)) / 86400000)) : 0);

interface Props {
  summary: DashboardSummary;
  people: PersonSummary[];
  waitlist: WaitlistRow[];
  rows: PersonSummary[];
  reviewQueue: PersonSummary[];
  greeting: string;
  view: DashboardView;
  cohort: "all" | "invited";
  title: string;
  empty: string;
  more: { href: string; label: string };
  sort: ModernSort;
  onSort: (s: ModernSort) => void;
  onPick: (v: DashboardView, cohort?: "all" | "invited") => void;
  onReview: () => void;
  onRow: (index: number) => void;
  onActivity: (id: string) => void;
}

export function ModernDashboard({
  summary: d,
  people,
  waitlist,
  rows,
  reviewQueue,
  greeting,
  view,
  cohort,
  title,
  empty,
  more,
  sort,
  onSort,
  onPick,
  onReview,
  onRow,
  onActivity,
}: Props) {
  const [feed, setFeed] = useState<"activity" | "funnel">("activity");
  const [now] = useState(() => Date.now());
  const [limit, setLimit] = useState(5);
  const [feedLimit, setFeedLimit] = useState(3);
  const submitted = reviewQueue.length;
  const oldest = daysWaiting(reviewQueue[0]?.person.submittedAt);
  const delayed = reviewQueue.filter((r) => daysWaiting(r.person.submittedAt) >= 14).length;
  const count = view === "not_invited" ? waitlist.length : rows.length;
  const showing = Math.min(limit, count);
  const photos = new Map(people.map((r) => [r.person.id, r.fields?.photo || undefined]));
  const approved = people
    .filter((r) => r.person.status === "approved" && r.person.approvedAt)
    .map((r) => Date.parse(r.person.approvedAt!));
  const trend = Array.from(
    { length: 8 },
    (_, i) => approved.filter((date) => date <= now - (7 - i) * 7 * 86400000).length,
  );
  const metrics: { key: DashboardView; label: string; value: number; hint?: string }[] = [
    { key: "submitted", label: "Waiting for review", value: submitted, hint: "Submitted, ready for review" },
    {
      key: "changes_requested",
      label: "Making edits",
      value: d.counts.changes_requested,
      hint: "Sent back for changes",
    },
    { key: "approved", label: "Live profiles", value: d.counts.approved },
    { key: "not_invited", label: "Ready to invite", value: d.waitlist.not_invited },
  ];
  const pick = (next: DashboardView, scope: "all" | "invited" = "all") => {
    setLimit(5);
    onPick(next, scope);
  };
  const moveTab = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = metrics.length - 1;
    const targets: Record<string, number> = {
      ArrowLeft: (index + last) % metrics.length,
      ArrowRight: (index + 1) % metrics.length,
      Home: 0,
      End: last,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    pick(metrics[target].key);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[target]?.focus();
  };
  const reviewButton = (
    <Button variant="primary" size="sm" iconEnd={<ArrowRight />} onClick={onReview}>
      Start reviewing
    </Button>
  );
  return (
    <div className="mo-dashboard">
      <header className="mo-greeting">
        <div>
          <h1>{greeting}</h1>
          <p>
            {submitted ? (
              <>
                {submitted} {submitted === 1 ? "profile is" : "profiles are"} waiting for your review. The oldest has
                waited {oldest} {oldest === 1 ? "day" : "days"}.
              </>
            ) : (
              "Your review queue is clear."
            )}
          </p>
        </div>
        <div className="mo-actions">
          <ButtonLink size="sm" href="/owners/waitlist/?status=not_invited" iconStart={<Mail />}>
            Invite people
          </ButtonLink>
          {submitted > 0 && reviewButton}
        </div>
      </header>
      <div className="mo-stats" role="tablist" aria-label="At a glance">
        {metrics.map((m, index) => (
          <button
            type="button"
            role="tab"
            aria-controls="dash-list"
            aria-selected={view === m.key && cohort === "all"}
            key={m.key}
            onKeyDown={(event) => moveTab(event, index)}
            onClick={() => pick(m.key)}
          >
            <span className="mo-stat-label">
              {m.label}
              {m.key === "submitted" && submitted > 0 && <small>Oldest {oldest}d</small>}
            </span>
            <strong>
              {m.value}
              {m.key === "not_invited" && <small> / {d.waitlist.total}</small>}
            </strong>
            {m.hint && <span className="mo-hint">{m.hint}</span>}
            {m.key === "approved" && (
              <span
                className="mo-trend"
                role="img"
                aria-label={`Live profiles now: ${m.value}; seven weeks ago: ${trend[0]}`}
              >
                {trend.map((total, i) => (
                  <i key={i} style={{ height: `${Math.max(9, (total * 100) / Math.max(1, m.value))}%` }} />
                ))}
              </span>
            )}
            {m.key === "not_invited" && (
              <span className="mo-meter" aria-hidden="true">
                <i style={{ width: `${(m.value * 100) / Math.max(1, d.waitlist.total)}%` }} />
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mo-columns">
        <section className="mo-panel mo-queue" aria-labelledby="mo-queue-heading">
          <header>
            <h2 id="mo-queue-heading">
              {title}
              {cohort === "invited" && " · Invited people"} <span>{count}</span>
            </h2>
            {view === "submitted" && (
              <SegmentedControl
                label="Queue order"
                size="sm"
                value={sort}
                onChange={(value) => onSort(value as ModernSort)}
                options={[...sortChoices]}
              />
            )}
            <ButtonLink href={more.href} variant="ghost" size="sm" iconEnd={<ArrowRight />}>
              {view === "submitted" ? "Open queue" : "See all"}
            </ButtonLink>
          </header>
          <div id="dash-list" role="tabpanel" aria-label={title}>
            <div className="mo-row mo-row-labels" aria-hidden="true">
              <span>{view === "not_invited" ? "Email" : "Gigster"}</span>
              <span>{view === "not_invited" ? "ZIP" : "Complete"}</span>
              <span>{view === "not_invited" ? "Joined" : view === "submitted" ? "Waiting" : "Updated"}</span>
              <span />
            </div>
            {!count ? (
              <p className="mo-empty">{empty}</p>
            ) : view === "not_invited" ? (
              <ul>
                {waitlist.slice(0, limit).map(({ signup }) => (
                  <li className="mo-row" key={signup.id}>
                    <span className="mo-person">
                      <Mail aria-hidden="true" />
                      <span>
                        <b>{signup.email}</b>
                        <small>{signup.category ? waitlistCategoryLabel(signup.category) : "Waitlist"}</small>
                      </span>
                    </span>
                    <span>{signup.zip}</span>
                    <time dateTime={signup.createdAt}>{shortDate(signup.createdAt)}</time>
                    <span />
                  </li>
                ))}
              </ul>
            ) : (
              <ul>
                {rows.slice(0, limit).map((r, i) => {
                  const p = r.person;
                  const complete = Math.round(r.completeness * 100);
                  const at = (view === "submitted" ? p.submittedAt : p.updatedAt) || p.updatedAt;
                  return (
                    <li key={p.id} className="mo-row" data-first={view === "submitted" && i === 0 ? "" : undefined}>
                      <span className="mo-person">
                        <OwnerAvatar id={p.id} name={p.name} src={r.fields?.photo || undefined} className="size-9" />
                        <span>
                          <button type="button" onClick={() => onRow(i)}>
                            {p.name || p.email}
                          </button>
                          <small>
                            {r.fields?.position
                              ? [r.fields.position, ...r.fields.areas].filter(Boolean).join(" · ")
                              : p.email}
                          </small>
                        </span>
                      </span>
                      <span className="mo-complete">
                        {r.fields ? (
                          <>
                            <i
                              aria-hidden="true"
                              style={{ background: `conic-gradient(var(--ink-brand) ${complete}%, var(--line) 0)` }}
                            />
                            {complete}%
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                      <time
                        dateTime={at}
                        className={view === "submitted" && daysWaiting(at) >= 14 ? "mo-wait" : undefined}
                      >
                        <Clock3 aria-hidden="true" />
                        {view === "submitted" ? `${daysWaiting(at)}d` : ago(at).replace(/ ago$/, "")}
                      </time>
                      <span className="mo-row-action" aria-hidden="true">
                        {view === "submitted" ? "Review" : "Open"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <footer>
            <span>
              {showing} of {count} {count === 1 ? "person" : "people"}
            </span>
            {count > showing && (
              <button type="button" onClick={() => setLimit((n) => n + 10)}>
                Show more
              </button>
            )}
          </footer>
        </section>
        <div className="mo-side">
          <section className="mo-panel mo-feed" aria-labelledby="mo-feed-heading">
            <header>
              <h2 id="mo-feed-heading">{feed === "activity" ? "Recent activity" : "From invite to live"}</h2>
              <SegmentedControl
                size="sm"
                label="Show"
                value={feed}
                onChange={(value) => setFeed(value as "activity" | "funnel")}
                options={[
                  { value: "activity", label: "Activity" },
                  { value: "funnel", label: "Funnel" },
                ]}
              />
            </header>
            {feed === "activity" ? (
              <>
                <ActivityList
                  events={d.activity.slice(0, feedLimit)}
                  onOpen={onActivity}
                  photoFor={(id) => photos.get(id)}
                />
                {feedLimit < d.activity.length && (
                  <footer>
                    <button type="button" onClick={() => setFeedLimit((n) => n + 5)}>
                      More activity
                    </button>
                  </footer>
                )}
              </>
            ) : (
              <div className="mo-funnel">
                <p>Out of {d.funnel.invited} invited, plus {d.funnel.signedUp} who signed up on their own. Pick a step to list it.</p>
                <FunnelCompact
                  bare
                  d={d}
                  selected={cohort === "invited" || view === "signed_up" ? view : undefined}
                  onSelect={(x) => pick(x, x === "signed_up" ? "all" : "invited")}
                />
              </div>
            )}
          </section>
          {submitted > 0 && (
            <aside className="mo-reminder">
              <h2>
                {delayed
                  ? `${delayed} ${delayed === 1 ? "profile has" : "profiles have"} waited 14+ days`
                  : `${submitted} ${submitted === 1 ? "profile is" : "profiles are"} ready for review`}
              </h2>
              <p>Review the oldest submission first.</p>
              {reviewButton}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
