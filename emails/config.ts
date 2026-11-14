/*
 * Settings shared by every email, HTML and plain text alike, decided 13 Nov 2026 (docs/feedback-2026-11-13.md, "Decisions").
 * Company OS sends copies of these templates: after a change, run `pnpm emails:companyos <company-os checkout>`.
 */

/**
 * Office mailing address confirmed by the owner, 14 Nov 2026, and present in the November 3 Call Sheet broadcast.
 * Keep this setting shared by HTML and plain text; no recipient-specific unsubscribe token belongs here.
 */
export const MAILING_ADDRESS = "11766 Wilshire Blvd, Los Angeles, CA 90025";

/** The footer's address line: "Between Gigs · <address>". */
export const FOOTER_ADDRESS_LINE = `Between Gigs · ${MAILING_ADDRESS}`;

/**
 * When a Gigster can expect to hear back after submitting, read as "You'll hear from us <REVIEW_TIME>." A concrete
 * promise (Peter: "say when they can expect to hear from us"); the email and /profile/submitted/ both read it.
 */
export const REVIEW_TIME = "within 3\u00a0business days";

/**
 * Vetting, for the confirmation email. The vetting today is the team's review, which the email already describes
 * ("Our team will review your profile…"), so this adds nothing. No background check exists; if one is added, say here
 * in one sentence when it happens and how we'll get in touch.
 */
export const VETTING_NOTE: string | null = null;

/** How the Gigster emails sign off (Peter, Nov 2026: "we're part of a community, not a cold machine"). */
export const SIGN_OFF = "The Between Gigs Team";
