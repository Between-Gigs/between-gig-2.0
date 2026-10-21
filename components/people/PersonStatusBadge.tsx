import { Badge, type BadgeTone } from "@ds/components";
import { CircleCheck, CircleDashed, FilePen, Mail, MessageSquareWarning, Send, UserCheck } from "lucide-react";
import type { PersonStatus } from "@/lib/data";

/*
 * The six people statuses. The design system's StatusBadge has Draft, Changes requested and Approved but
 * not Invited, Registered or Submitted (requested in docs/design-system-requests.md), so this maps all six
 * onto Badge with the tones BRAND.md assigns and an icon, so status is never color alone.
 */
export const personStatusMeta: Record<PersonStatus, { label: string; gigsterLabel: string; tone: BadgeTone; Icon: typeof Mail }> = {
  invited: { label: "Invited", gigsterLabel: "Invited", tone: "neutral", Icon: Mail },
  registered: { label: "Registered", gigsterLabel: "Not started", tone: "neutral", Icon: UserCheck },
  draft: { label: "Draft", gigsterLabel: "Draft", tone: "warning", Icon: FilePen },
  submitted: { label: "Submitted", gigsterLabel: "Submitted for review", tone: "info", Icon: Send },
  changes_requested: { label: "Changes requested", gigsterLabel: "Changes requested", tone: "warning", Icon: MessageSquareWarning },
  approved: { label: "Approved", gigsterLabel: "Approved", tone: "success", Icon: CircleCheck },
};

export function PersonStatusBadge({ status, audience = "owner", size = "md", className }: { status: PersonStatus; audience?: "owner" | "gigster"; size?: "sm" | "md"; className?: string }) {
  const m = personStatusMeta[status] ?? { label: status, gigsterLabel: status, tone: "neutral" as const, Icon: CircleDashed };
  return (
    <Badge tone={m.tone} size={size} icon={<m.Icon aria-hidden="true" />} className={className}>
      {audience === "gigster" ? m.gigsterLabel : m.label}
    </Badge>
  );
}
