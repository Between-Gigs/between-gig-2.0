import { cx } from "@ds/components";
import { Page } from "@/components/site/Page";

/**
 * Sign-in and join share one frame, the way Airbnb does it: a single centred card with a small centred header
 * ("Log in", "Sign up") over a divider, then the form's own heading and fields at full width. Nothing else competes
 * with the form. `lead` is a short note at the foot of the card.
 */
export function AuthShell({ header, lead, children, className }: {
  header: string; lead?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <Page className="max-w-6xl">
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-lg border border-line bg-surface shadow-md sm:my-8">
        <p className="border-b border-line px-6 py-5 text-center text-label-md text-ink">{header}</p>
        <div className={cx("p-6 sm:p-8", className)}>
          {children}
          {lead && <div className="mt-8 border-t border-line pt-5 text-body-sm text-ink-muted">{lead}</div>}
        </div>
      </div>
    </Page>
  );
}
