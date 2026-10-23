# New-user signup callback repair — 23 October 2026

This follows the local open-signup repair and password-copy clarification. The acceptance path is an entirely
new user with no invitation: email/name/terms → native Clerk SignUp password → application session → profile
creation → sign out → return with the same password. Existing Google identities must remain the same users.

## Additional functional defect reproduced and fixed

The earlier checks stopped at the native widget handoff or exercised the sample adapter directly. An isolated
SDK-boundary integration test now performs a cold callback to `/between-gig-2.0/profile/edit/`, with Clerk user
loading delayed. Before this repair the role guard navigated to login before identity initialization completed.
Even when the browser recovered to the builder, the test caught an unwanted login round trip.

`ClerkLayer` now reports loading until both the identity SDK and the matching application session have
initialized. `useSession`, profile guards, and the login/signup redirects respect that loading state. Public
metadata remains the only owner-role input. A stale existing session cannot authorize a protected profile while
another identity is still loading. Existing profile data and optional invites retain the earlier behavior.

## Evidence and limits

`scripts/qa/clerk-contract.mjs` builds a separate temporary copy, replacing only its Clerk module with
`scripts/qa/fixtures/clerk-mock.tsx`. Production `next.config.ts` and production output are never replaced with a
mock or runtime bypass. All external requests are blocked. The mock stores fake test credentials only in its
browser context; it does not use a real provider account, email or secret.

The contract checks both 8-character and 21-character fake passwords, short-password rejection by the mock,
invalid returning credentials, no invitation, initial role Gigster despite malicious unsafe metadata claiming
owner, a cold profile callback without login bounce, one application person record, returning login preserving
that record, denial at owner pages, and the original Google identity/password state unchanged. The tests run
at mobile and desktop widths and exercise the actual application components, Bridge, sample adapter and guards.

This proves application handoff/session behavior under the tested Clerk interface contract. It does not prove
real Clerk password enforcement, email delivery, OAuth client configuration, DNS, production authentication or
provider session tasks. Real-provider verification remains a separate browser check when access is available.

The frontend already contains `/join`, `/login` and `/profile/edit` and now has a tested callback path between
them. It currently has no native UserProfile/account-security route for an existing Google user to add a password.
That separate existing-user capability is not the new-user signup path and was not introduced here. Preserve the
existing Google identity; do not create a second account or set a user's password in an admin tool/chat.

No Clerk setting, DNS record, credential or remote GitHub permission was changed. Do not retry the existing
403 push denial until verified new installation/credential authorization arrives. Publication is still pending.
