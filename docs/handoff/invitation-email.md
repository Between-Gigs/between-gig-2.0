# Invitation email preview

`emails/invite.ts` is the invitation source; `/emails/invite/` is its canonical browser view. The old `/preview/gigster-journey/` entry forwards to that view and preserves query/hash state. The account experiment remains at `/preview/gigster-journey/account/`, with its profile and review stages intact.

The invitation has one profile CTA after the supplied Stage 2 body. The original headline and Los Angeles opportunity line remain above the body. The independent checklist, time estimate, personal-link lifetime and immediate publication claims have been removed.

The HTML template and plain-text twin retain `{{{RESEND_UNSUBSCRIBE_URL}}}` for Resend to resolve at send time. The browser preview replaces that macro with an inactive label and an explanation; it must never contain a personalized unsubscribe token. Privacy points to `https://between-gigs.com/privacy`; support points to `mailto:hello@between-gigs.com`. The mailing address is the shared verified office address in `emails/config.ts`.

The invitation requests a light color scheme and uses inline text/background colors, presentation tables, live text and a plain-text twin. The browser's theme controls exercise the page and template rules; they are not an inbox emulator. Other templates retain their existing optional dark CSS. The verified mailing-address setting applies to their footers too.

Email clients can still force their own dark colors. [Apple describes color-scheme opt-in and Mail behavior](https://developer.apple.com/videos/play/wwdc2019/511/); [Microsoft documents client recoloring and Classic Outlook background-image limitations](https://learn.microsoft.com/en-us/troubleshoot/dynamics-365/customer-insights/journeys/email/email-troubleshoot-rendering). Classic Outlook can omit CSS backgrounds, and VML requires a fixed calculated height. A solid fallback with live text is preferable to a fixed-height section that clips translated or enlarged text. Browser checks do not establish actual Gmail, Outlook or Apple Mail rendering.

No email has been sent, no broadcast changed or scheduled, and no Company OS template copy has been updated by this preview work.

Pending: inspect the supplied reference image pixels before implementing the hero's requested removal of the white panel. The supported Library transfer failed, including the consumer-local retry. The existing hero is retained until that inspection is possible. Keep the PR draft and do not merge/deploy this partial design revision.
