"use client";
import { Button, Drawer, useToast, cx } from "@ds/components";
import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck, CircleDashed, ExternalLink, MapPin, MessageSquareWarning, Sparkles, Wallet } from "lucide-react";
import * as React from "react";
import { data, type PersonSummary } from "@/lib/data";
import { basisShort, monthStatusLabel } from "@/lib/data/taxonomy";
import { sectionLabel } from "@/lib/profile/validate";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { PersonStatusBadge } from "@/components/people/PersonStatusBadge";
import { ProfilePreviewCard } from "@/components/profile/ProfilePreviewCard";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { shortDate } from "./format";
import { Meter } from "./kit";
import { missingFields, SuggestEdits } from "./ReviewPanel";

const first = (name: string) => name.split(" ")[0] || name;

/**
 * A person, opened over the dashboard instead of on a new page. Top to bottom: where you are in the list
 * (a step bar naming who's before and after), who they are, what to check before approving, the facts, and
 * their card as clients will see it. The footer names the previous and next person; ← → move between them.
 * For submitted profiles, Approve and Suggest edits move straight on to the next person, with Undo.
 */
export function PersonDrawer({ rows, index, onIndex, onClose, onChanged }: {
  rows: PersonSummary[]; index: number | null; onIndex: (i: number) => void; onClose: () => void;
  /** Called after a decision (or its undo) so the dashboard refreshes its numbers and lists in place. */
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const [suggest, setSuggest] = React.useState(false);
  const row = index === null ? null : rows[index] ?? null;
  const open = row !== null;
  const prev = index !== null && index > 0 ? rows[index - 1] : null;
  const next = index !== null && index < rows.length - 1 ? rows[index + 1] : null;

  // ← and → walk the list while the panel is open (not while typing, and not under the edits dialog).
  React.useEffect(() => {
    if (!open || suggest) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight" && next && index !== null) { e.preventDefault(); onIndex(index + 1); }
      if (e.key === "ArrowLeft" && prev && index !== null) { e.preventDefault(); onIndex(index - 1); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, suggest, next, prev, index, onIndex]);

  // Decisions take the person out of the list it was opened from; stay on the same slot (the next person).
  const decided = async (message: string, id: string, name: string) => {
    await onChanged();
    toast({
      message, tone: "success",
      action: { label: "Undo", onClick: () => void data.owners.undoReview(id).then(onChanged).then(() => toast({ message: `Undone. ${name} is back in the queue.` })) },
    });
  };

  const approve = async () => {
    if (!row) return;
    setBusy(true);
    try { await data.owners.approve(row.person.id); await decided(`${row.person.name} approved · now live`, row.person.id, row.person.name); }
    catch { toast({ message: "Couldn't approve. Try again.", tone: "danger" }); }
    finally { setBusy(false); }
  };

  const p = row?.person, f = row?.fields;
  const missing = f ? missingFields(f) : [];
  const name = p ? p.name || p.email : "";
  const reviewing = p?.status === "submitted" && !!f;

  return (
    <>
      <Drawer open={open} onClose={onClose} side="right" size="lg" title={name || "Person"}
        description={p ? <span className="inline-flex flex-wrap items-center gap-2"><PersonStatusBadge status={p.status} size="sm" />{f?.position}</span> : undefined}
        footer={p && (
          <div className="flex w-full flex-wrap items-center gap-2">
            {/* Named neighbours: you always know who's before and after. */}
            <div className="flex min-w-0 items-center gap-1">
              <Button size="sm" variant="ghost" iconStart={<ChevronLeft />} disabled={!prev} onClick={() => index !== null && onIndex(index - 1)}
                aria-label={prev ? `Previous: ${prev.person.name || prev.person.email}` : "Previous: none, this is the first"} aria-keyshortcuts="ArrowLeft">
                <span className="max-w-28 truncate max-sm:sr-only">{prev ? first(prev.person.name || prev.person.email) : "Start"}</span>
              </Button>
              <Button size="sm" variant="ghost" iconEnd={<ChevronRight />} disabled={!next} onClick={() => index !== null && onIndex(index + 1)}
                aria-label={next ? `Next: ${next.person.name || next.person.email}` : "Next: none, this is the last"} aria-keyshortcuts="ArrowRight">
                <span className="max-w-28 truncate max-sm:sr-only">{next ? first(next.person.name || next.person.email) : "End"}</span>
              </Button>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              {reviewing ? (
                <>
                  <Button size="sm" variant="secondary" iconStart={<MessageSquareWarning />} onClick={() => setSuggest(true)}>Suggest edits</Button>
                  <Button size="sm" variant="primary" iconStart={<CircleCheck />} loading={busy} onClick={() => void approve()}>
                    <span>Approve{next && <span className="max-sm:sr-only"> &amp; next</span>}</span>
                  </Button>
                </>
              ) : (
                <ButtonLink href={`/owners/people/${p.id}/`} size="sm" variant="secondary" iconEnd={<ExternalLink />}>Open full profile</ButtonLink>
              )}
            </div>
          </div>
        )}>
        {p && index !== null && (
          <div className="grid gap-6">
            {rows.length > 1 && <QueueSteps rows={rows} index={index} onIndex={onIndex} reviewing={reviewing} />}

            {/* Who: portrait, contact, where they are and how complete. */}
            <section aria-label="About them" className="flex items-center gap-5 rounded-lg border border-line bg-surface-raised p-4">
              <PersonPhoto id={p.id} name={p.name || "?"} src={f?.photo || undefined} alt="" fallback="brand" department={f?.position} skills={f?.skills}
                className="size-24 shrink-0 rounded-md" />
              <div className="grid min-w-0 flex-1 gap-1.5">
                <a href={`mailto:${p.email}`} className="inline-flex min-h-11 w-fit max-w-full items-center truncate text-body-md text-ink hover:text-ink-brand sm:min-h-6">{p.email}</a>
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-body-sm text-ink-muted tabular-nums">
                  <span>ZIP {p.waitlistZip}</span><span>Invited {shortDate(p.invitedAt) ?? "—"}</span>{p.submittedAt && <span>Submitted {shortDate(p.submittedAt)}</span>}
                </p>
                {f && <Meter value={row!.completeness * 100} label="Profile complete" />}
              </div>
            </section>

            {/* What to check: one card, a line per item, so it reads as a checklist rather than an alert. */}
            {reviewing && (
              <section aria-labelledby="pd-check" className="grid gap-3">
                <h3 id="pd-check" className="text-label-md text-ink">Before you approve</h3>
                <ul className="grid gap-2">
                  {missing.map((m) => (
                    <li key={m.label} className="flex items-start gap-3 rounded-md bg-warning-soft p-3 text-body-sm text-ink">
                      <CircleDashed className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                      <span><b className="font-semibold">{m.label} is missing.</b> Suggest edits and the note is written for you.</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-3 rounded-md bg-surface-sunken p-3 text-body-sm text-ink-muted">
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    <span>{missing.length ? "Everything else is filled in." : "Every required answer is filled in."} Check their card below reads well for clients.</span>
                  </li>
                </ul>
              </section>
            )}
            {p.status === "changes_requested" && (
              <section aria-labelledby="pd-notes" className="grid gap-3">
                <h3 id="pd-notes" className="text-label-md text-ink">Waiting on their edits</h3>
                <ul className="grid gap-2">
                  {(p.reviewNotes ?? []).map((n) => (
                    <li key={n.note} className="flex items-start gap-3 rounded-md bg-warning-soft p-3 text-body-sm text-ink">
                      <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" /><span><b className="font-semibold">{sectionLabel[n.section]}:</b> {n.note}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {f ? (
              <>
                <ul aria-label="Their answers" className="grid grid-cols-1 gap-3 xs:grid-cols-2">
                  {([
                    [Wallet, "Rate", f.rate ? `$${f.rate}/${basisShort[f.basis]}` : "On request"],
                    [CalendarDays, "This month", monthStatusLabel[f.monthStatus]],
                    [MapPin, "Areas", f.areas.join(" · ") || "—"],
                    [Sparkles, "Services", f.services.join(", ") || "—"],
                  ] as const).map(([Icon, k, v]) => (
                    <li key={k} className="flex min-w-0 gap-3 rounded-md border border-line p-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-sunken text-ink-brand"><Icon className="size-4" aria-hidden="true" /></span>
                      <span className="grid min-w-0 gap-0.5"><span className="text-label-sm text-ink-subtle">{k}</span><span className="text-body-sm text-ink">{v}</span></span>
                    </li>
                  ))}
                </ul>
                {/* Their card on a stage, the way it sits in client search. */}
                <section aria-labelledby="pd-card" className="grid gap-3">
                  <h3 id="pd-card" className="text-label-md text-ink">How clients see their card</h3>
                  <div className="grid place-items-center rounded-lg bg-surface-sunken p-5 sm:p-8">
                    <ProfilePreviewCard fields={f} personId={p.id} badge={null} className="w-full max-w-xs" />
                  </div>
                </section>
              </>
            ) : (
              <p className="rounded-md border border-dashed border-line-dashed p-4 text-body-sm text-ink-muted">
                {p.status === "invited" ? "Invited, hasn't created an account yet." : "Has an account, hasn't started the questionnaire."}
              </p>
            )}
            {!reviewing && p.status !== "invited" && p.status !== "registered" && (
              <ButtonLink href={`/owners/people/${p.id}/`} variant="ghost" size="sm" iconEnd={<ExternalLink />} className="justify-self-start">See everything they filled in</ButtonLink>
            )}
          </div>
        )}
      </Drawer>
      {p && f && reviewing && (
        <SuggestEdits open={suggest} person={p} fields={f} onClose={() => setSuggest(false)}
          onSent={() => { setSuggest(false); void decided(`Edits sent to ${first(p.name) || "them"}`, p.id, p.name); }} />
      )}
    </>
  );
}

/**
 * Where you are in the list: "Reviewing 2 of 4", a segment per person (done, here, to come) you can jump
 * to, and the names either side. Long lists keep the segments and drop the names under them.
 */
function QueueSteps({ rows, index, onIndex, reviewing }: { rows: PersonSummary[]; index: number; onIndex: (i: number) => void; reviewing: boolean }) {
  const total = rows.length;
  return (
    <nav aria-label="Position in this list" className="grid gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-label-md text-ink tabular-nums">{reviewing ? "Reviewing" : "Viewing"} {index + 1} of {total}</p>
        <p className="text-body-sm text-ink-subtle tabular-nums">{total - index - 1 === 0 ? "Last one" : `${total - index - 1} to go`}</p>
      </div>
      <ol className="flex gap-1">
        {rows.map((r, i) => {
          const label = r.person.name || r.person.email;
          return (
            <li key={r.person.id} className="min-w-0 flex-1">
              <button type="button" onClick={() => onIndex(i)} aria-current={i === index ? "step" : undefined} title={label}
                aria-label={`${i + 1}. ${label}${i === index ? " (here)" : ""}`}
                className="group grid w-full gap-1.5 py-1 text-left">
                <span aria-hidden="true" className={cx("h-1.5 rounded-full transition-colors duration-fast",
                  i < index ? "bg-ink-brand/40" : i === index ? "bg-action" : "bg-surface-sunken group-hover:bg-line-strong")} />
                {total <= 6 && (
                  <span aria-hidden="true" className={cx("truncate text-caption", i === index ? "font-semibold text-ink" : "text-ink-subtle group-hover:text-ink-muted")}>{first(label)}</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
