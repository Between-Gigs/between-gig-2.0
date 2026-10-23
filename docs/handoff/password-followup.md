# Password signup follow-up — 23 October 2026

Target: `Between-Gigs/between-gig-2.0`, GitHub Pages `/between-gig-2.0/demo/`, `/join/`, `/login/`.
The separate `imagine-os` repository and production Supabase site are outside this repair.

## Verified source state

A fresh read-only fetch still resolves remote `main` to `e7f127a7580b75b8a4be194d3f16f586faded6e0`.
The signup repair `3f473540c4b7e5b017b93b60ee2e2624e95dec05` remains local only. Its original patch and bundle
are preserved in `deliverables/`. Its earlier branch push was denied with HTTP 403 to `jmassion`.
No denied write was retried and no alternative remote write route was used in this follow-up.

Remote main still requires an invitation at `/join`, hides signup navigation on login, and signs a verified
Clerk user back out when the browser sample has no matching call-sheet person. This can produce the
"not on the call sheet" warning described in the user's screenshot metadata. It is an application rejection,
not evidence that Clerk rejected the user's password.

Direct Pages access and Clerk's public `/v1/environment` returned HTTP 403 in this environment. Therefore
the exact live deployment version and current Clerk instance settings could not be independently observed.
The Library resolved the user's screenshot and supplied a summary of the call-sheet warning, but its
supported pixel download failed. Parent should inspect the original image.

## Password versus code

1. The application details form collects email/name/terms, then renders Clerk's native `<SignUp>`.
   It does not create a password itself or call an email-code-only signup API. Clerk's current instance
   settings determine the actual password field. A password-required configuration should collect it there.
2. Login renders native `<SignIn>`; it does not force an email-code strategy in Clerk mode. The original
   remote copy incorrectly promises a six-digit-code login with no password. The saved repair removes it;
   this follow-up explicitly explains password login while retaining existing account methods.
3. A code after password creation can verify ownership of the email. Password creation and required email
   verification are separate. Keep email verification, MFA, session tasks and compromised-password checks.
4. Only a build with no Clerk publishable key uses the custom sample-code login. It is now clearly labeled
   as offline sample mode. It is not a password account and must not be mistaken for the configured Pages login.

Current provider references: [Clerk SignIn](https://clerk.com/docs/react/reference/components/authentication/sign-in),
[authentication options](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options).
No Clerk setting, password policy, identity, role or security protection was changed.

## Local follow-up

The signup CTA says **Continue to password**; the next screen is headed **Create your password** and explains
that a later code verifies email. Existing users are directed to their original login method/account recovery,
rather than told to create a duplicate account. Clerk still owns password collection and enforcement.
The earlier open-signup and optional-invitation repair remains intact.

Checks: TypeScript, ESLint, raw-value check, adapter regression tests, Clerk-enabled Pages build, and
`scripts/qa/clerk-entry.mjs` at mobile/desktop widths. The latter deliberately blocks Clerk requests and tests
terms validation, the password handoff, offline error/back recovery, existing-login guidance and Pages routes.
It does **not** verify a real password field, password acceptance, email delivery or successful Clerk login.

## Next owner action

Obtain new repository write-permission evidence before attempting publication; then review/apply the combined
patch, create a PR and run CI. In a browser able to reach the exact development Clerk app, inspect whether
Password is enabled/required for signup and available for login; do not alter the setting as part of this handoff.
Use supported test identities to check eight-character and longer passwords, short/compromised-password
rejection, required email verification, existing-password and existing-code/Google users, and role redirects.
If the provider never presents a password, report the exact current setting and proposed change for confirmation.
