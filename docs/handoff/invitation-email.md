# Invitation email preview

`emails/invite.ts` is the invitation source; `/emails/invite/` is its canonical browser view. The old `/preview/gigster-journey/` entry forwards to that view and preserves query/hash state. The account experiment remains at `/preview/gigster-journey/account/`, with its profile and review stages intact.

The invitation has matching profile CTAs in the hero and after the supplied Stage 2 body. The original headline and approved introductory sentence remain above the body. The independent checklist, time estimate, personal-link lifetime and immediate publication claims have been removed.

The HTML template and plain-text twin retain `{{{RESEND_UNSUBSCRIBE_URL}}}` for Resend to resolve at send time. The browser preview replaces that macro with an inactive label and an explanation; it must never contain a personalized unsubscribe token. Privacy points to `https://between-gigs.com/privacy`; support points to `mailto:hello@between-gigs.com`. The mailing address is the shared verified office address in `emails/config.ts`.

The invitation requests a light color scheme and uses inline text/background colors, presentation tables, live text and a plain-text twin. The browser's theme controls exercise the page and template rules; they are not an inbox emulator. Other templates retain their existing optional dark CSS. The verified mailing-address setting applies to their footers too.

Email clients can still force their own dark colors. [Apple describes color-scheme opt-in and Mail behavior](https://developer.apple.com/videos/play/wwdc2019/511/); [Microsoft documents client recoloring and Classic Outlook background-image limitations](https://learn.microsoft.com/en-us/troubleshoot/dynamics-365/customer-insights/journeys/email/email-troubleshoot-rendering). Classic Outlook can omit CSS backgrounds, and VML requires a fixed calculated height. A solid fallback with live text is preferable to a fixed-height section that clips translated or enlarged text. Browser checks do not establish actual Gmail, Outlook or Apple Mail rendering.

No email has been sent, no broadcast changed or scheduled, and no Company OS template copy has been updated by this preview work.

The hero uses the exact text-free Craft Invitation portrait from the existing wallpaper gallery (the live-server copy in public/email is byte-identical). Its pixels were inspected: scissors/fabric, camera, wedding photographs, swatches/pencil, hammer/gloves and lower sketches/paint/cable surround the clear cream center. This gallery asset is the approved background; no separate reference-image transfer is required. The invitation alone now places live logo/headline/introductory copy directly on that background with no white card, shadow or separate artwork strip. The hero button and end-of-body button use the same approved profile destination. Other craft templates retain their existing layout.

Presentation tables, inline colors, responsive padding/type and a solid cream fallback keep the live text readable when background images are blocked or unsupported. Classic Outlook may omit the decorative scene; no fixed-height VML background is added. Clients that force dark colors can still recolor content. No actual-inbox QA or universal dark-mode immunity is claimed.

## Sending to typed addresses

The owner Emails page has a "Send this invitation to…" box (live only; the sample never sends). Type up to 10 addresses, separated by commas, spaces or new lines, and confirm. Route `owners.inviteAddresses` (owner only), implemented by `inviteAddresses` in `lib/server/gigs.ts`; it reuses the waitlist's `sendInvite`, so the email is the same `invite` message (category marketing) with the footer and the person-bound unsubscribe link.

Addresses are trimmed, lower-cased and de-duplicated. More than 10 valid addresses refuses the whole request (400). Each address then gets one result, and one failing never stops the others: `sent`, `already_member` (the person has signed in, or Company OS says the account exists), `suppressed` (privacy request: 422 `contact_suppressed`), `opted_out` (unsubscribed: Company OS cancels the email), `invalid`, `failed`.

These people are marketing contacts who never opted in: the unsubscribe link must work. To test deliverability to our own inbox use a `+test` address (a person with no account yet); an address that already has an account is skipped.
