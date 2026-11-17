# Invitation light appearance and PDF proportions

This isolated visual update follows `Between-Gigs-Coming-Soon-and-Invitation-Revised.pdf`, version 5, modified 17 November 2026 at 06:40 UTC (page 2). It increases the live invitation logo from 112×35 to 200×62px, increases YOU'RE INVITED from 13/18 to 22/28px, and centres the content group in the clear area of the existing Craft Invitation wallpaper. The existing 50/52px main title, approved Stage 2 copy, two identical supplied profile destinations, unsubscribe placeholders, mailing address and plain-text twin are preserved. Responsive sizes keep the artwork's centre readable on phones.

The signed-out public website header increases Los Angeles Call Sheet from the small to the large heading token at desktop widths (lg and above); the phone band and tablet text are unchanged. No profile, auth, role, CMS, data or dashboard logic changes.

The invitation retains light-only colour-scheme metadata. Its inline literal text colours also carry WebKit text-fill hints; solid surfaces and buttons receive same-colour CSS gradients, while the hero wallpaper is retained. These are best-effort defences against selective dark-mode recolouring, not a universal lock. Gmail/Outlook versions may ignore hints, force transformations, or hide backgrounds; desktop Outlook can show the solid cream fallback. Text and links remain live. Other emails' rendered bytes are unchanged.

Checks: TypeScript; targeted ESLint; token check; existing invitation/copy/transport/source-isolation tests; responsive browser captures at 320, 390, 768 and 1440px in light and dark preference. Browser preference is not an actual Gmail/Outlook/Apple Mail inbox emulator. No email sent and no inbox-client immunity claimed.

## Release boundary

The frontend preview and Company OS stored sending template are separate. Use the frontend's existing renderer with `--invite-only` to refresh `deploy/recipes/between-gigs/emails/invite.html` in the actual backend checkout. Check its current main first and preserve all other templates and subjects. Apply only the invitation template through the normal reviewed release/recipe process; do not blindly apply a full recipe or dispatch existing queues. No backend schema/API changes are needed. Existing queued messages can contain frozen old content; do not rewrite or resend them as part of this visual change.

Normal Railway production is a tagged manual release, not an automatic effect of merging main; Pages updates from main. Do not describe a merged preview as an updated production sender. The same release must include the updated frontend assets before sending the refreshed invitation.
