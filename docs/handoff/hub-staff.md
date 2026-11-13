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

In progress: route alias, navigation/self-profile path, Staff page and API adapter.
Verification and deployed commit will be recorded here after integration.
