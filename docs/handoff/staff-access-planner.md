# Staff access planner — proposal, not authorization

## Current delivery

Recovered independently from draft PR57 onto the verified v1.6.4 tree in `recovery/staff-access-preview-20261118`. Product Development PR56 is not included. Its planner row is unavailable until that separate feature ships. The existing live Navigation tab and role tools remain intact. The Staff page adds an Access planner tab with editable Simple, Medium and Advanced proposals, a View/Edit matrix aligned with dashboard sections, dependencies and a proposed sidebar. Sensitive actions reflect Justin’s confirmed intent; unconfirmed sensitive actions remain off. Coming-soon sections cannot be selected. The planner stays mounted across Staff tab changes and changes page memory only; reloading or leaving the Staff page discards its draft; switching Staff tabs preserves it. It cannot apply permissions, send invitations, or modify accounts. Existing Staff tools and owner gates remain unchanged.

Justin confirmed Simple for Peter, Medium for Patti, and distinct Advanced plans for Anowar (Designer), Anuraag (Developer), and Justin (Product Manager). These are intended audiences, not assigned roles. No live users or grants were changed. Advanced is not a superadmin role, and selecting Simple does not revoke permissions supplied by another role. No private correspondence was imported for this preview.

## Confirmed intent — Justin’s reply, 2026-11-15

| Person | Experience | Confirmed intent reflected in preview |
| --- | --- | --- |
| Peter | Simple | Approve profiles and view private contact details |
| Patti | Medium | Publish profiles and send messages/invitations |
| Anowar | Advanced / Designer | View all company information; **cannot approve profiles** |
| Anuraag | Advanced / Developer | Manage team access and export company data |
| Justin | Advanced / Product Manager | Manage team access and export company data |

Anowar and Anuraag are separate people. Never resolve them from a nickname or assign one person’s privileges to the other. Account identities still need verification at application time.

These are policy decisions for the editable preview, **not executed live grants**. Applying persistent changes requires the exact named account and per-action permission delta to be reviewed/confirmed under the coordinator’s instruction. Existing owner roles remain unchanged. The preview does not silently demote Anowar or claim his current live role already prevents approvals.

### Remaining implementation details (do not repeat answered questions)

- Draft editing choices remain proposals. Do not infer publishing, sending, importing or deleting from a person’s job title.
- Peter’s approval and Patti’s publication are separate capabilities in this model. If the current approval endpoint automatically publishes, resolve that coupling before granting either; do not silently grant both.
- Peter/Patti record-assignment rules remain undefined. Assigned records are not equivalent to the existing database `own` / created-by scope.
- Anowar’s view-all intent includes company data visibility, but no editing, export, send or access administration is inferred. Actual field/record scope must be reviewed in the before/after delta.
- Justin/Anuraag export and team administration do not automatically grant unrelated sensitive actions; imports and deletion remain off. Define precise export entity/field scope before applying.
- Existing roles combine. If Anowar is currently a superadmin, adding a restrictive Designer preset alone cannot satisfy “cannot approve.” Safely reconcile effective permissions on the server with a reviewed transition; preserve another trusted admin and prevent lockouts.

All plans remain editable. A customization is a proposal, not another confirmed grant. Coming-soon sections cannot receive access. No private communication import or live mutation occurred.

## Existing source and enforcement boundary

Frontend inspection at PR56 base `d98f30c3c1d6587688b418ded134acb988ecc0c7`:

- `components/owners/OwnerGate.tsx` requires owner access. `lib/server/gigs.ts` maps Company OS `me.isSuperAdmin` to the owner session role. A normal reviewer currently does not gain the dashboard simply by having data grants.
- `lib/server/routes.ts` marks owner actions such as dashboard, review queue, people, waitlist and invitations as owner-only. Personal Gigster operations retain their own session checks.
- `components/owners/OwnerStaff.tsx` already exposes role memberships and raw entity CRUD scopes. The planning tab does not call those mutations. Existing protection must remain until a fully tested replacement is available.

Company OS source inspected at `ab802321912a97b2973b94245c2f0b01748fbf3a`:

- `apps/api/src/services/tenant-context.ts` builds membership/permission context for a tenant; entity/action grants are exact IDs, with default none. Role capabilities alone are not record authorization.
- `apps/api/src/services/metadata.ts` gives newly created entities' CRUD grants only to that tenant's super_admin role. Metadata descriptions are not access controls.
- `apps/api/src/query/policy.ts` and `query/engine.ts` enforce read permission and tenant predicates; `routes/runtime.ts` checks generic CRUD. Ordinary roles without explicit entity grants are denied. Existing operator/superadmin behavior must remain explicit.
- Actual deployed grants still require an authorized audit; source inspection is not proof of a live tenant's configuration. Module sync can reinstall module grants, so a policy change must account for recipe defaults and sync, not just a one-off UI patch.

## Implementation after the proposed matrix is confirmed

1. Define stable section IDs with granular command and field capabilities. Separate presentation preference (Simple/Medium/Advanced layout) from authorization and from existing superadmin status. Store tenant-scoped, versioned policy and assignments. Start deny-by-default for new staff capabilities, while preserving the verified current owners.
2. Resolve effective permissions on the server from all memberships, showing each permission's origin. The UI shows an explicit before/after delta for a named user. Hidden navigation is only a reflection of these decisions; direct links, requests and queries must be protected independently.
3. Add matching frontend server guards for pages and every action. Do not replace owner checks with a generic signed-in check, and do not use a privileged service identity to bypass a user's denied access. Preview, draft editing, publication, email delivery, upload, deletion and import/export need separate guards.
4. Enforce Company OS data access for both application routes and direct generic APIs, scoped to tenant, record assignment and allowed fields. Restrict profile editing to an explicit field allowlist. A generic update grant must not allow setting publication status, grants, private contact fields or other privileged columns. Aggregate/list/detail/export endpoints need the same restrictions. If field-level and assignment policies cannot express this safely, implement command endpoints and restrict generic grants rather than relying on UI filters.
5. Keep private communication/source notes and contact information separately restricted; sanitise shared previews and exports. No cross-tenant IDs or parent links may escape the tenant boundary. Validate actor and subject belong to the same tenant.
6. Make policy and membership changes atomic and revision-checked. Re-evaluate actor authority in the transaction; prevent self-elevation, self-lockout and removal/demotion of the final administrator. UI warnings do not replace these backend rules. Concurrent role edits must fail safely, with no partial grants. Sensitive grants require explicit approval and must never be inferred from preset selection.
7. Record actor, tenant, subject, reason, request ID, policy revision and exact before/after policy and memberships in a protected audit log. Invalidate authorization caches on changes and test immediate revocation. Support idempotent retries.
8. Roll back a targeted policy revision and its assignments using the recorded before-state, with the same authorization, revision and last-admin safeguards. Never reset unrelated roles or an entire tenant. Keep a trusted owner session available during staged verification.

## Verification and release gates

Local preview checks cover model dependencies, unconfirmed sensitive actions defaulting off, no proposal mutations on the network, real-sidebar preservation, draft reset, desktop/mobile light/dark layout and accessibility. They do **not** prove live authorization or persistence.

Before enabling real policy application, test on an isolated approved test tenant with synthetic records:

- Anonymous and signed-in nonstaff: direct pages, action APIs, generic query/list/detail/aggregate and exports denied.
- Each approved preset: exact permitted view/edit commands succeed and all other commands fail. Never test only hidden navigation.
- Assigned-only records: other assignments and cross-tenant IDs fail, including parent links, searches, counts, nested requests and bulk endpoints. Private fields are absent, not merely hidden by CSS.
- Sensitive actions cannot be triggered by generic updates or replayed URLs; read/preview does not authorize send, publish, import/export or delete.
- Multiple roles: effective union and origins match the review screen; smaller layout does not falsely promise revocation. Existing owners and Gigster personal flows remain functional.
- Revocation, stale policy revisions, duplicate request IDs, simultaneous last-admin removals and actor demotion during a change fail safely.
- Audit records, cache invalidation and a targeted rollback are verified, including failure handling.

Coordinate shared auth files and backend migration numbering with the Patti/invitation integrator. Ship this planning preview independently; it does not block Product Development or invitation releases. No backend schema, migration, Railway or environment changes belong to this preview PR. Do not deploy or apply grants merely because the planning UI passed its local tests.

## Original preview verification receipt — 2026-11-15

- TypeScript and targeted ESLint passed; design-token raw-value check passed; static Next production build passed.
- Six access-plan tests passed (confirmed intent, distinct designer/developer permissions, prerequisites, dependent clearing, immutable proposals and unavailable controls).
- Playwright workflow passed at 1440px and 390px in light and dark: all five person-specific proposals, prerequisite toggles, disabled sensitive application, unchanged actual sidebar, draft retention across tabs, and zero network mutation requests from the planner.
- Axe WCAG 2 A/AA and 2.1 AA returned zero violations at those four viewport/theme combinations. Mobile matrix fits without horizontal page overflow.
- Two independent read-only source reviews found no remaining substantive blockers. These checks apply to the planning preview only; live grants and future enforcement were not tested or changed.

Reproduce: `pnpm build && node scripts/qa/staff-access-planner.mjs`. Chromium defaults to `/usr/bin/chromium`; override with `CHROMIUM_PATH`. Captures and Axe results default to `deliverables/staff-access-planner` (`QA_OUTPUT` overrides). Screenshots are fictional local sample data, not a live account.


## Recovery verification — 18 November 2026

The original release gate for actual grants remains unchanged. This extraction ships only the non-operative planning UI. No live identity is resolved or assigned, no permission application exists, and no Company OS/tenant/email/sending change is included. The current Navigation tab is a separate live menu-visibility feature and is not driven by this plan. The planner keeps Product Development and other unshipped sections disabled. The old Product Development dependency is removed from the preview release, not from future enforcement work.

Current QA covers 320/390/1440 in light and dark, all five presets, prerequisite clearing, disabled Apply, unchanged sidebar, tab retention, reload reset, no network mutations and scoped/current-page Axe. It is included in Signup checks with retained artifacts. Require final source reviews and exact-head hosted CI before integration; record the final tag and production verification outside this source handoff.
