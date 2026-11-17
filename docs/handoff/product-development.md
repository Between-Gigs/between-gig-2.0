# Product Development workspace

Independent workstream, based on main 26838ebd9254d59753bcf22ca60a1393710a21b3, 2026-11-15. No release claim.

Scope: Studio Product Development (first), Social, Ads, PR (one coming-soon entry), Skills, Characters and Copywriting coming soon; Team Communications and Meetings coming soon; Tools, Accounts and Finance coming soon in appropriate sections.

Use Company OS existing tenant metadata, records, query and guarded batch API for private persistent phases and work records. No new backend release or migrations planned. No change to profile, invitation, DNS, auth or existing role permissions. Do not bundle this with Patti PR41/63 or invitation PR55/70; frontend 1.3.0/API1.15.0 are allocated to invitation work. Coordinate release version after integration.

Tests first: deny anonymous/non-superadmin requests before any data reads; fixed tenant and entity allowlist; bounded hostile input and safe URLs; guarded concurrent edits; missing setup not represented as saved; checked relationship integrity; completion requires evidence; denominator excludes archived, container and communication items; a snapshot is not a realtime deployment monitor. Preview uses conspicuously fictional ephemeral records only; live never imports that fixture.

Review plan: lane review if split; integrated independent review round 1, fix findings; fresh integrated independent review round 2; responsive desktop/mobile light/dark and real persistence/authorization checks before production acceptance. Existing sidebar stays mounted.

Phase 0 complete and Phase 1 nearly complete are owner statements, not a calculated percentage. Phase1 comprises Gigster onboarding and owner review. DNS, waitlist import, profile editor and copy/layout need sourced milestone records. Private source correspondence stays out of public source and sample builds. Exact release/verification states will be reconciled before seeding.

Playbook impact: none; existing generic API, no backend code changes.


## Implemented, 15 November 2026

Route: `/owners/product-development/` within the persistent owner shell. Studio starts with Product Development; Social, Ads, PR is one coming-soon item, Copywriting, Skills, Characters and Tools are also coming soon. Team retains Staff and adds Team Communications, Meetings, Accounts and Finance coming soon. Existing role grants are unchanged.

Overview, list, board and timeline views support editable phases, project/milestone hierarchy, tasks, checklists, requests, deliverables and source communications. Records include classification, owner, journey, blocker, acceptance criteria, dates, dependencies, deployment context and dated evidence. Progress counts active actionable leaf records; phase narrative remains owner-reported. It is not a realtime release monitor.

The server route verifies Company OS superadmin status, fixes the tenant from server configuration, and allows only its two entities. Setup creates `product_development_phase` and `product_development_item` using existing metadata and batch APIs. Missing tables show an explicit setup state; mismatched tables fail closed. Existing tables/records are not reset. No backend source, tenant recipe, auth keys or role assignments were changed.

Writes use the existing atomic batch `ifMatch` mechanism: record revisions prevent stale edits, and a shared Phase 0 revision serializes participating graph writes. Persistent action IDs and payload hashes deduplicate retries. Graph validation prevents missing/cross-phase references, completion dependency loops, orphaned work, reopening prerequisites of completed work, and hiding tasks below informational communications. Communications are leaf records and do not inflate progress.

## Validation evidence

- Two independent integrated review rounds, followed by focused re-review of fixes: no remaining substantive findings.
- Full test suite: 534 passed, 8 skipped; 72 test files passed. TypeScript, ESLint and design-token checks passed.
- Static, server and live API server builds passed. Live code-split check: all 24 pages, no sample-data leakage or dashboard code on public pages. Bundle secret scan passed.
- Server check: 24 routes, security headers/nonces, 15 internal routes absent, 34 server-only routes, existing hub/preview aliases and test gate passed.
- Browser workflow and axe WCAG checks passed at 1440px and 390px in light and dark mode, including create/edit/archive, phase editing, views/filtering, no overflow and persistent sidebar. The browser fixture is explicitly fictional and ephemeral.
- Browser workflow is now in Signup checks CI. Screenshots are sample-mode visual evidence, not proof of live database persistence.
- Local Linux server builds used `TMPDIR=/workspace/bg-build-tmp` because `/tmp` is on a different filesystem; this avoids the pre-existing hard-link copy fallback issue without changing release scripts beyond route allowlists.

## Private source intake

A separate private handoff contains 79 sourced records: the 57-request Patti checklist, 18 task-only correspondence summaries and four operational/release snapshots. It is intentionally absent from this public repository. Merged source changes are not automatically marked verified done. Imported communications do not count as duplicated work.

`scripts/import-product-development.mjs /private/product-intake.json` validates the intake without network access. To apply, initialize the authenticated owner workspace first, then use the script's `--apply --base=https://test.between-gigs.com` or production option with a short-lived `BG_ADMIN_SESSION_TOKEN` supplied securely. The gated test host also needs `BG_TEST_GATE_COOKIE`. Neither is logged or stored. Stable source keys make retries idempotent; changed payloads require reconciliation rather than silent overwrites.

## Remaining release acceptance — not claimed complete

1. Confirm the final branch CI and merge against current main; preserve invitation PR55 changes if it lands first. This work has not reserved or changed a release number. Frontend 1.3.0/API 1.15.0 remain allocated to invitation work.
2. Deploy this candidate to test through the existing workflow. Using a real superadmin session, initialize metadata, create/edit a disposable QA record, reload in a new browser context, and confirm database persistence. Confirm stale updates refuse to overwrite and the existing tenant cannot read another tenant's records.
3. Confirm anonymous and ordinary Gigster sessions cannot read or initialize this workspace. Static GitHub Pages contains only fictional sample records; live uses the authenticated API alias.
4. Import the private source intake only after the hosted checks pass. Reconcile statuses against current releases and actual acceptance checks; never interpret the conservative intake percentage as overall Phase 1 completion.
5. Select the next compatible frontend version after the invitation release, then use Cut release and Deploy web (prod). This subthread has no working GitHub CLI credential, browser session or workflow-dispatch tool, so it cannot claim those actions ran.
6. Verify the production route and persistence. Rollback uses the prior frontend release; the two additive private entities can remain intact. Do not delete data as rollback.

Shared-file coordination: `next.config.ts`, `scripts/server-build.mjs`, `scripts/check-split.mjs`, `.github/workflows/checks.yml`, `components/owners/OwnerShell.tsx`. No edits to package.json, company-os.json, backend app/env/Railway/comms/recipe/playbook or migration numbering. No external messages, emails or invitations sent.

Navigation-only follow-up: added Copywriting (Coming soon) under Studio at Justin’s request; preserves every existing item. This changes the PR head, so rerun/check CI on the new head before release. Earlier screenshots predate this one additional entry.
