"use client";
import { Banner, Button, Drawer, IconButton, useToast } from "@ds/components";
import { ChevronLeft, ChevronRight, CircleCheck, ExternalLink, MessageSquareWarning } from "lucide-react";
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

/**
 * A person, opened over the dashboard instead of on a new page: who they are, what's missing, how their card
 * looks to clients, and for submitted profiles Approve and Suggest edits. Previous / next walk the list it was
 * opened from, so a whole queue can be reviewed without the page underneath ever changing.
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

  return (
    <>
      <Drawer open={open} onClose={onClose} side="right" size="lg" title={name || "Person"}
        description={p ? <span className="inline-flex items-center gap-2"><PersonStatusBadge status={p.status} size="sm" />{f?.position}</span> : undefined}
        footer={p && (
          <div className="flex w-full flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <IconButton size="sm" variant="ghost" label="Previous" icon={<ChevronLeft />} disabled={!index} onClick={() => index && onIndex(index - 1)} />
              <span className="text-body-sm text-ink-muted tabular-nums">{(index ?? 0) + 1} of {rows.length}</span>
              <IconButton size="sm" variant="ghost" label="Next" icon={<ChevronRight />} disabled={index === null || index >= rows.length - 1} onClick={() => index !== null && onIndex(index + 1)} />
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              {p.status === "submitted" && f ? (
                <>
                  <Button size="sm" variant="secondary" iconStart={<MessageSquareWarning />} onClick={() => setSuggest(true)}>Suggest edits</Button>
                  <Button size="sm" variant="primary" iconStart={<CircleCheck />} loading={busy} onClick={() => void approve()}>Approve</Button>
                </>
              ) : (
                <ButtonLink href={`/owners/people/${p.id}/`} size="sm" variant="secondary" iconEnd={<ExternalLink />}>Open full profile</ButtonLink>
              )}
            </div>
          </div>
        )}>
        {p && (
          <div className="grid gap-5">
            <div className="flex items-center gap-4">
              <PersonPhoto id={p.id} name={p.name || "?"} src={f?.photo || undefined} alt="" className="size-14 shrink-0 rounded-md" textClass="text-heading-md" />
              <div className="grid min-w-0 gap-0.5 text-body-sm text-ink-muted">
                <a href={`mailto:${p.email}`} className="truncate hover:text-ink">{p.email}</a>
                <span className="tabular-nums">ZIP {p.waitlistZip} · invited {shortDate(p.invitedAt) ?? "—"}{p.submittedAt && ` · submitted ${shortDate(p.submittedAt)}`}</span>
                {f && <Meter value={row!.completeness * 100} label="Profile complete" />}
              </div>
            </div>

            {p.status === "submitted" && (
              missing.length
                ? <Banner tone="warning" title={`Missing: ${missing.map((m) => m.label).join(", ")}`}>Suggest edits to ask for it; the note is filled in for you.</Banner>
                : <Banner tone="success" title="Every required answer is filled in">Check the card below, then approve or suggest edits.</Banner>
            )}
            {p.status === "changes_requested" && (
              <Banner tone="warning" title="Waiting on their edits">
                <ul className="grid gap-1">{(p.reviewNotes ?? []).map((n) => <li key={n.note}><b>{sectionLabel[n.section]}:</b> {n.note}</li>)}</ul>
              </Banner>
            )}

            {f ? (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-line p-4 text-body-sm">
                  {[
                    ["Rate", f.rate ? `$${f.rate}/${basisShort[f.basis]}` : "On request"],
                    ["This month", monthStatusLabel[f.monthStatus]],
                    ["Areas", f.areas.join(" · ") || "—"],
                    ["Services", f.services.join(", ") || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="grid min-w-0 gap-0.5"><dt className="text-label-sm text-ink-subtle">{k}</dt><dd className="text-ink">{v}</dd></div>
                  ))}
                </dl>
                <div className="grid gap-2">
                  <p className="text-label-sm text-ink-subtle">How clients see their card</p>
                  <ProfilePreviewCard fields={f} personId={p.id} badge={null} className="max-w-sm shadow-none" />
                </div>
              </>
            ) : (
              <p className="rounded-md border border-dashed border-line-dashed p-4 text-body-sm text-ink-muted">
                {p.status === "invited" ? "Invited, hasn't created an account yet." : "Has an account, hasn't started the questionnaire."}
              </p>
            )}
            {p.status !== "submitted" && p.status !== "invited" && p.status !== "registered" && (
              <ButtonLink href={`/owners/people/${p.id}/`} variant="ghost" size="sm" iconEnd={<ExternalLink />} className="justify-self-start">See everything they filled in</ButtonLink>
            )}
          </div>
        )}
      </Drawer>
      {p && f && p.status === "submitted" && (
        <SuggestEdits open={suggest} person={p} fields={f} onClose={() => setSuggest(false)}
          onSent={() => { setSuggest(false); void decided(`Edits sent to ${p.name.split(" ")[0] || "them"}`, p.id, p.name); }} />
      )}
    </>
  );
}
