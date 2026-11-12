import { Badge } from "@ds/components";
import { Mail, UserPlus } from "lucide-react";
import type { PersonSource } from "@/lib/data";

/** How someone came in: an owner invited them, or they signed up by themselves. Icon and label, never colour alone. */
export const personSourceLabel: Record<PersonSource, string> = { invited: "Invited", self: "Signed up" };

export function PersonSourceBadge({ source = "invited", size = "sm", className }: { source?: PersonSource; size?: "sm" | "md"; className?: string }) {
  const Icon = source === "self" ? UserPlus : Mail;
  return <Badge tone="neutral" size={size} icon={<Icon aria-hidden="true" />} className={className}>{personSourceLabel[source]}</Badge>;
}
