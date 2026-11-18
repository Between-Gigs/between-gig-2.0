# Private staff menu configuration

Source-only lane based on frontend `fa485b485b4d174177bf085300994cbdce948448`.
No live setup, save, role/grant change, SQL, recipe, release or deployment was performed.

## Scope and authority

Staff → Navigation configures menus for current Company OS superadmin staff only.
These settings are not permissions, approval/publication rights, privacy controls,
or route authorization. Existing guards continue to protect every destination.
Ordinary staff remain Gigsters and cannot be promoted through these settings;
their navigation customization is explicitly unavailable in this version. Supporting
ordinary own-read requires a separate reviewed contract; no ordinary grants or
elevated reader credentials are added here. PR57's Access planner remains separate.

Every verified owner keeps an unfiltered **Manage team menus** account action,
which performs a document navigation to `/owners/staff/?view=navigation`.
Hiding Staff, a section, profile links or a mode cannot hide that recovery action.
The menu catalog in `lib/staff-navigation/registry.ts` is the shared source for
validation, configuration controls and the owner navigation's stable item IDs.

## Existing supported Company OS contracts

`POST /api/staff-navigation/{snapshot,setup,save,repair}/` accepts JSON plus the
caller's Bearer session. It uses no platform/service credential. Before reading
configuration it verifies strict `isSuperAdmin === true`, identity and the exact
configured tenant slug/UUID (`between-gigs` or `between-gigs-dev`). Target users
are looked up through current `/admin/users` memberships.

The adapter uses existing `/meta/entities`, `/admin/roles`, `/admin/users`,
`/query` and `/batch`; no new Company OS endpoint is assumed. Batch `ifMatch`
guards the revision atomically; `membershipSnapshot` checks the target's complete
membership IDs under the same tenant lock. A per-action Idempotency-Key is used.
Schema/configuration responses are private/no-store and vary on Authorization.

The sole entity is `user_interface_visibility`, tenant-wide, with exactly:

| Key | Type | Required |
| --- | --- | --- |
| user | user_reference | yes |
| active | boolean | yes |
| schema_version | number | yes |
| revision | number | yes |
| visible_modes | json | yes |
| visible_items | json | yes |

Setup is an explicit button/action. It creates only this reviewed fixed metadata,
including the standard new-entity superadmin CRUD grants created by Company OS. Existing grants are retained; ordinary-role access is not added. Reads never initialize it.
Existing incompatible schema, missing superadmin CRUD, or any non-superadmin
grant on the entity causes refusal, without editing metadata or grants. There is
no caller-controlled tenant, entity, path, schema or API operation.

## Persistence and conflicts

Missing storage uses existing authorized menu defaults and reports that it is
not configured. Valid records contain allowlisted mode/item arrays and schema
version 1. The current user's configuration is reloaded on identity change,
returning to the window, and local menu saves. No private configuration is cached
in browser storage on the live data source.

Metadata cannot enforce unique(user). Parallel first creates can yield duplicate
active records: reads fail closed to basic personal menus plus admin recovery,
never union or choose one silently. The explicit repair UI retains the chosen
record and atomically deactivates the others using all observed revisions and
the target membership snapshot. It never deletes records. Conflicts exceeding
the API's 200-op atomic batch limit require a separate owner repair plan.

Stale edits return 409. An uncertain network outcome reports that a write may
already have completed. Refresh/readback is required; a retry whose desired
values already exist returns the current verified record without creating again.
Post-write readback refuses conflicting or concurrently changed values. A prior
successful save does not guarantee another admin cannot change it later.

Raw generic API access remains available to actual superadmins under their
existing authority. This UI does not claim a database-level uniqueness or JSON
constraint. Unexpected/malformed stored data requires owner inspection.

## Verification and activation

Red baseline `3d1bd5a` introduced failing model/server tests before implementation.
Tests cover supported identities, missing schema/no read mutation, exact setup,
schema/grant refusal, membership snapshots, revision CAS, duplicates/repair,
uncertain writes, retry readback, menu allowlists and actual navigation renderers.
Browser QA uses only fictional local storage and blocks external requests. It
checks desktop/mobile, light/dark, reload persistence, unchanged identity,
unsupported ordinary roles, recovery, selected-other-admin setup and accessibility. Setup/readback races are guarded by the current selection generation. Staff view controls wrap at 320px rather than overflowing.

Static and live builds must retain the live-only gateway alias and pass sample
bundle checks. Two independent integrated source reviews precede the draft PR.
The coordinator owns GitHub writes and release ordering; this lane must not delay
the existing navigation/Hub gate release or bundle unrelated PR56/57/101 changes.

Actual hosted Company OS persistence, tenant provisioning and real-account
acceptance remain unverified until separately authorized. No setup or save is
automatically invoked by deployment or a page read. Rolling back the frontend
leaves this private configuration data intact; no role or permission is altered.

Playbook impact: none
