# Patti review — implementation and release handoff

Source intake: [all 57 requested changes](../feedback-patti-2026-11-14.md). Baseline frontend: 1adf0f2f26b7825045cd6a9fdd0ce3364e4ee287.
Frontend branch: patti-review-20261114 (PR #41). Backend branch: patti-profile-review-20261114.
Review destination: Railway test. Production remains a separate later release.

## What is implemented

Account headings, duplicate Clerk copy removal, phone label, invitation size/copy/line breaks/sign-off, and Professionals heading.
The profile editor places experience before services; searchable/custom skill chips replace department entry.
Location uses the four required travel choices, a beyond-LA checkbox, and market-specific postal input/validation.
Services retain drag/keyboard ordering, expose Other clearly, count it in the maximum of five, and put instructional prompts and examples in the requested order.
Hourly and project choices are independent; hourly amount is required, minimum hours and minimum project price are optional.
Availability has its own separator and revised labels.
Showcase supports images and MP4 upload, HTTPS video/image links, optional thumbnails, 160-character captions, ordering, replacement and image alignment.
Uploads enforce 10 MiB images and 50 MiB / 120-second MP4 container duration; images are rasterized before upload.
Old browser-held images are imported to live storage on first opening the enabled new editor; crop alignment is retained.
Credits, LinkedIn, personality copy, work-location choices, equipment, insurance notes and contact preferences follow the intake.
The already deployed final review copy remains exact.

## Storage and privacy

Profiles 1.5.0 introduces optional generic public_details and private_details JSON fields; only public_details is in public-reader field policies.
The frontend whitelist excludes phone, contact methods, booking permission, marketing permission and insurance notes from public details and sample public projections.
The server records notice version, phone snapshot and time when private preferences change.
The signed-in email-preference endpoint accepts no person id and changes only the caller's own marketing preference and consent record.
New uploads share the existing authenticated per-person save queue. Draft submission stops when the current save fails.
The five-item editor limit includes Other; portfolio file quotas also count video and thumbnail files.

## Email unsubscribe

The old Resend broadcast placeholder was inappropriate for Company OS's /emails API delivery.
Templates now use links.unsubscribe. The dispatcher replaces a neutral marker with a recipient- and tenant-bound signed token, supplies List-Unsubscribe / List-Unsubscribe-Post, and checks suppression again before sending.
GET validates and shows a confirmation; POST opts out idempotently without login. Account/booking categories are unaffected.
The visible footer, plain-text twin and delivered headers use the same destination. Preview unsubscribe remains inactive.
Company OS invitations use the marketing category so later attempts respect the preference.

The account's separately managed Resend Broadcast lists are outside this Company OS delivery path. Before using those lists again, reconcile their contact/subscription state against Company OS's canonical marketing preferences; this programme does not send or synchronize a live Broadcast.

## Release sequence and required owner work

1. Anu reviews the integrated Company OS branch, including both review rounds and the isolated customer/database integration tests.
2. Deploy Company OS to Between Gigs test using its existing workflow, and apply the updated Between Gigs recipe. Other tenants keep their existing requirements.
3. Configure a stable COMMS_UNSUBSCRIBE_SECRET (at least 32 characters) on the API service (the scheduler only calls the API); never paste its value into chat or git. Without it, a promotional message requiring the new signed link fails closed.
4. Set GitHub's test-environment variable PROFILE_REVIEW_ENABLED=1 and deploy this frontend. The workflow builds NEXT_PUBLIC_PROFILE_REVIEW and sets runtime COMPANY_OS_PROFILE_REVIEW from that same choice.
5. Verify with a signed-in test account: save/reload on another device; imported old photos; both pricing choices; own marketing preference; public-reader privacy; reviewed file publication; one delivered test invite and its opt-out, including cancellation of a queued invitation.
6. Client acceptance, then a separate production decision.

Until step 4, the real Railway profile keeps the compatible existing editor. The Hub/Pages fictional sandbox exercises the new editor. This is explicit staging, not a claim that browser-only answers already reached the review team.
Booking channel preferences do not enable an outbound SMS/WhatsApp provider. Before enabling one, implement and test STOP/HELP, suppression and revocation handling; the email marketing checkbox never authorizes promotional calls or texts.

## Verification record

- Failing requirements tests were run before implementation; new postal/rate/privacy/media tests are green.
- Frontend typecheck, ESLint, raw-value check and static build pass.
- 505 tests passed in the full Windows frontend run. The remaining packaging portability issue is in the existing Linux tar/symlink test; Linux CI is required.
- 56 targeted backend tests pass, including email templates, profile compatibility, public/private policy and signed-token checks. Backend API TypeScript passes.
- The browser connection on this workstation is unavailable. The existing CI browser suite plus patti-review.mjs checks location, both prices, custom skills, persistence and mobile/desktop overflow. Do not claim visual approval before it passes.
- Real Company OS save/read, storage publication and delivered email opt-out remain release-gate checks.

## Recovery

Keep this branch and checklist as the single intake. Preserve existing user data and unrelated work.
Rollback frontend flags to blank/0 and restore the baseline frontend; do not delete stored details or media.
Record actual deployment SHA, URLs and item-level exceptions after the test release.

Playbook impact: see the Company's inbox entry added for this review.

Other-only profiles can submit through the private service_proposal field with the Between Gigs allow_service_proposal setting. The team must categorise the proposed service before approving publication; the sample approval path follows the same rule.
