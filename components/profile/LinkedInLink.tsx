import { linkedinHref, profileDetailsEnabled } from "@/lib/profile/details";

/** A public "LinkedIn" link on a profile: only with the details flag on, only a real linkedin.com profile or company page. */
export function LinkedInLink({ value }: { value?: string }) {
  const href = profileDetailsEnabled() ? linkedinHref(value) : "";
  if (!href) return null;
  return (
    <p className="text-body-sm text-ink-muted">
      <a className="inline-flex min-h-11 items-center text-link underline underline-offset-2" href={href} target="_blank" rel="noopener noreferrer">LinkedIn<span className="sr-only"> (opens in a new tab)</span></a>
    </p>
  );
}
