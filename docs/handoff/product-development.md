# Product Development workspace

Independent workstream, based on main 26838ebd9254d59753bcf22ca60a1393710a21b3, 2026-11-15. No release claim.

Scope: Studio Product Development (first), Social, Ads, PR (one coming-soon entry), Skills and Characters coming soon; Team Communications and Meetings coming soon; Tools, Accounts and Finance coming soon in appropriate sections.

Use Company OS existing tenant metadata, records, query and guarded batch API for private persistent phases and work records. No new backend release or migrations planned. No change to profile, invitation, DNS, auth or existing role permissions. Do not bundle this with Patti PR41/63 or invitation PR55/70; frontend 1.3.0/API1.15.0 are allocated to invitation work. Coordinate release version after integration.

Tests first: deny anonymous/non-superadmin requests before any data reads; fixed tenant and entity allowlist; bounded hostile input and safe URLs; guarded concurrent edits; missing setup not represented as saved; checked relationship integrity; completion requires evidence; denominator excludes unscheduled/archived non-leaf items; a snapshot is not a realtime deployment monitor. Preview uses conspicuously fictional ephemeral records only; live never imports that fixture.

Review plan: lane review if split; integrated independent review round 1, fix findings; fresh integrated independent review round 2; responsive desktop/mobile light/dark and real persistence/authorization checks before production acceptance. Existing sidebar stays mounted.

Phase 0 complete and Phase 1 nearly complete are owner statements, not a calculated percentage. Phase1 comprises Gigster onboarding and owner review. DNS, waitlist import, profile editor and copy/layout need sourced milestone records. Private source correspondence stays out of public source and sample builds. Exact release/verification states will be reconciled before seeding.

Playbook impact: none; existing generic API, no backend code changes.
