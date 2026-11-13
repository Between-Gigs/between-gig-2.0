/*
 * Settings shared by every email, HTML and plain text alike, decided 13 Nov 2026 (docs/feedback-2026-11-13.md, "Decisions").
 * Company OS sends copies of these templates: after a change, run `pnpm emails:companyos <company-os checkout>`.
 */

/**
 * Where Between Gigs is, in every footer. The street address that was here (11766 Wilshire Blvd) was a stand-in nobody
 * recognised, so it's gone: an email shouldn't print an address that isn't the company's. CAN-SPAM asks commercial
 * email (the invite) for a valid postal address: when Between Gigs has one (a street address, P.O. box or registered
 * private mailbox), put it here in full, e.g. "123 Main St · Los Angeles, CA 90000".
 */
export const MAILING_ADDRESS = "Los Angeles, California";

/** The footer's address line: "Between Gigs · <address>". */
export const FOOTER_ADDRESS_LINE = `Between Gigs · ${MAILING_ADDRESS}`;

/**
 * When a Gigster can expect to hear back after submitting, read as "You'll hear from us <REVIEW_TIME>." A concrete
 * promise (Peter: "say when they can expect to hear from us"); the email and /profile/submitted/ both read it.
 */
export const REVIEW_TIME = "within 3 business days";

/**
 * What vetting there is, for the confirmation email: the team's review of every profile, which is real today. No
 * background check exists, so none is mentioned; if one is added, say here when it happens and how we'll get in touch.
 */
export const VETTING_NOTE: string | null = "Every profile is read by a person on our team before it goes live. If we need anything else from you, we'll email you.";

/** How the Gigster emails sign off (Peter, Nov 2026: "we're part of a community, not a cold machine"). */
export const SIGN_OFF = "YOUR BETWEEN GIGS TEAM";
