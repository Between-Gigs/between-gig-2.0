# Hub, experiences and staff

Programme: hub-staff-experiences, 12 Nov 2026.
Frontend: Between-Gigs/between-gig-2.0. Backend: existing Company OS endpoints; no backend schema or release change.
Baseline / rollback: 326c7558550edbdee4ad81f425a621d69fafc10d (Pages); Railway test was deployed separately.

## Accepted behavior

- /hub is the main Hub address; /preview remains a temporary compatibility alias.
- Hub and its sample tools remain available signed out during Clerk testing. This does not grant access to real owner data or staff mutations.
- Superadmins keep their owner session and dashboard landing while opening their own Gigster profile. Joining as a Gigster requires explicit name and policy acceptance.
- Staff supports multiple simultaneous memberships, secure invitation links, and existing role permission rules.
- Pages keeps browser-local fictional data. Railway app uses Clerk and Company OS; the Hub contains a separate sample sandbox. Never describe sample changes as live database changes.
- Main updates publish Pages and, after its existing checks, Railway test. Production stays a separate manual release.

## Company OS contract

Read first: Company OS docs/STATE.md, docs/integration-guide.md and actual admin/invitation/signup services.
Staff reads and mutations require the caller's superadmin session; no platform credential is used.
Multiple roles are separate memberships. Add roles through POST /admin/users; remove only the selected membership through DELETE /admin/memberships/:id.
Invitations can return a link or grant a role to an already signed-in account. A generated invitation link does not mean an email was sent.
Role permissions use none / own / all scopes. Row policies further constrain access; module synchronization can restore a removed module grant.

## Integration status

Implemented in [PR #11](https://github.com/Between-Gigs/between-gig-2.0/pull/11): canonical Hub and legacy redirects, three-way experience navigation, own-profile setup retaining owner authority, Staff UI and protected Company OS adapter.

Verified locally: static and live server builds; TypeScript and lint; unit tests; existing signup/product journeys; new Hub/Staff/profile browser journeys; 390, 420, 768 and 1440px layouts. Server smoke checked 21 live routes, 31 server handlers and the test passphrase gate. Browser testing through the standalone server confirmed Hub access without cookies, nested navigation/reload and protected real Staff routes. The live bundle scan confirmed no sample-data chunks on live app pages.

The authenticated Company OS operations were exercised with mocked backend responses. Actual Clerk sign-in and writes to real staff/profile records require a signed-in test account and remain unverified here. No real staff invitation was created.

## Invitation behavior

Creating an invitation provides a private sign-in link to copy and share. This flow does not queue an email. If additional role assignment fails after link creation, the link is preserved with a warning and actual memberships are refreshed. An already signed-in global account is treated as access established.

Existing Company OS limitation: a pending account with more than one non-provider staff role cannot be re-invited through its current role-matching rule. The UI reports that existing-link/backend-support requirement without altering memberships. The common Gigster + Super admin combination has one non-provider role and is supported.

## Screenshots

Actual built sample interfaces are under screenshots/hub-staff-v8/: Hub, staff roles, access matrix, mobile, personal profile setup and editor. They contain fictional sample people only.

## Release / rollback

Main updates publish Pages and trigger the existing full Railway test-deploy pipeline. Production remains manual. Railway test baseline deployment: a6399485-5d3f-4374-b5fd-f7b67463f69b; original frontend main: 326c7558550edbdee4ad81f425a621d69fafc10d. Use the Actions deployment run for the exact deployed source SHA; health alone is not version evidence.
