/*
 * Settings shared by every email, HTML and plain text alike. Each one is a single place to change wording the client
 * still has to confirm (open questions in docs/feedback-2026-11-13.md).
 */

/**
 * The postal address in every footer. CAN-SPAM requires a valid physical mailing address in commercial email.
 * PLACEHOLDER: 11766 Wilshire Blvd is not confirmed. Replace it with Between Gigs' real business mailing address
 * (a street address, P.O. box or registered private mailbox) before these emails go to real recipients.
 */
export const MAILING_ADDRESS = "11766 Wilshire Blvd · Los Angeles, CA 90025";

/** The footer's address line: "Between Gigs · <address>". */
export const FOOTER_ADDRESS_LINE = `Between Gigs · ${MAILING_ADDRESS}`;

/**
 * When a Gigster can expect to hear back after submitting, read as "You'll hear from us <REVIEW_TIME>."
 * Default wording pending the client's answer on review turnaround.
 */
export const REVIEW_TIME = "within a few business days";

/**
 * Vetting or background-check timing for the confirmation email. No policy exists yet, so it stays null and the email
 * says nothing about it.
 * TODO(client): if vetting or a background check is planned, set one sentence here, e.g. when it happens and how
 * we'll get in touch. Don't invent the policy.
 */
export const VETTING_NOTE: string | null = null;

/** How the Gigster emails sign off (Peter, Nov 2026: "we're part of a community, not a cold machine"). */
export const SIGN_OFF = "YOUR BETWEEN GIGS TEAM";
