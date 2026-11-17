# Profile form activation — candidate, not activated

This runbook covers the consolidated Patti form candidate. `company-os.json.requires` is the API baseline; the profile features no longer carry receipts. At deploy the server checks automatically that the backend has the profiles-module version each enabled flag needs (`/healthz/` answers 503 otherwise, so Railway keeps the old version serving), and `scripts/check-profile-activation.mjs` checks flag values, the publish-gate acknowledgement and the location cutoff.

## Configuration and preflight

Both deploy workflows validate declarations before infra plan/apply, setting synchronization or bundle deployment. No variable has been created or changed by this local candidate.

| GitHub environment variable | Build/runtime target | Absent | Explicit values |
| --- | --- | --- | --- |
| `PROFILE_NO_DEPARTMENT` | Build `NEXT_PUBLIC_PROFILE_NO_DEPARTMENT` | Live UI keeps existing Department behavior | `0` keeps existing UI; `1` retires canonical input after verified settings declaration |
| `CUSTOM_SERVICE_REVIEW` | Build `NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW` | Live custom-only UI remains off | `0` hides new UI; `1` requires explicit server guard and coordinated feature declaration |
| `CUSTOM_SERVICE_REVIEW_ENABLED` | Server variable of the same name | IaC preserves deployed value; sync omits it, initially absent means legacy mode | Only `1` is accepted for normal sync; `0` is refused to prevent an ordinary UI rollback removing enforcement |

`RAILWAY_ENV` is the existing workflow job's literal `test` or `production`; the operator does not invent a new environment. No `apiCommit` or settings receipt is recorded: the deploy checks the backend itself. Setting the backend options (settings changes) remains a manual, reviewed step.

Custom-service mode additionally requires `profileFeatures.customServiceReview.requires` to hold the actual allocated API minimum (same `>=A.B.C` syntax as global `requires`), global `requires` at least that minimum, and the reviewed profiles module declaration `1.5.0`. Module `1.5.0` is presently a **proposal** also used by unreleased media work: it does not establish which features are deployed. Record exact feature source provenance and inspect the installed settings schema. Neither baseline/diagnostic API `1.14`/`1.15` nor `/health` proves this capability. The recorded version and source must correspond to the release owner’s actual accepted tag; do not reserve or infer a new version here.

Department-only retirement needs no invented new API minimum; the installed submission settings must really omit `position`, which is a manual backend check. This catches the hidden-input/stale-required-settings mismatch independently of custom mode.

UI on + missing server guard refuses before infra mutation. Runtime-only `1` with UI `0` supports retaining safeguards during UI rollback. A blank server configuration does not reset an already deployed guard. The BFF retains its own UI-on/server-off503 refusal for misconfiguration outside these workflows. These controls do not replace backend authorization or atomic approval enforcement.

## Exact deployment/acceptance order

1. Reconcile both candidates against latest main and active invitation/dashboard/staff lanes. Preserve the invitation’s higher release priority. Obtain publication authorization where previously denied; resolve normal tag403 without changing protections/identity or bypassing controls. Reserve actual FE/API versions through release ownership only after exact heads and CI are accepted. Do not infer current production from source or tags alone.
2. Establish hosted test isolation through existing authorized operator evidence: API DB and Supabase project identity, isolated storage, test Clerk frontend/backend binding and approved fictional account/role, no-delivery mail safeguards. No raw-secret retrieval, unknown SSH-host trust, new credentials, resetDb or real-recipient mutation is authorized by this runbook.
3. Merge/cut the reviewed feature API via normal protected workflow; deploy the exact tag to **test first**. Test deployment attempts module sync and test recipe application. Existing-tenant recipe failures may only warn, so workflow green is insufficient. With existing authorized SuperAdmin/owner access, read installed profiles schema and settings; verify optional position, unchanged other requirements, and `approval_requirements:["service"]`. Read-only checks must use supported access; frontend reader/submitter tokens lack this authority and must not be broadened.
4. Leave production activation variables off. After applicable source-publication authorization and CI, use the normal coordinated workflow to deploy this checked frontend to **test**, enabling only test's approved public/runtime flags. This is the first activating frontend test deployment; it must happen before testing the new editor. Keep other lanes' test deployments coordinated, not concurrent. Run isolated real Clerk → Gigster editor → save/reload → submit → owner review → approval/refusal → public projection acceptance with approved neutral assets. Include custom-only private request accepted but not publicly approved without a visible catalog service, atomic refusal, pending/public privacy, international postal handling, checkbox mapping, retired-field/history retention, insurance privacy, image preservation, wrong-role/wrong-owner refusal and mail suppression. Native video remains paused; no Google Drive. Local fake/sample tests do not certify this flow.
5. Deploy the **same reviewed API tag** to production via the normal guarded workflow. Production migration/module sync **does not apply recipe settings**. Existing authorized operator must read before writing and apply only the two reviewed profiles settings through supported settings PATCH, retaining all other installed configuration. Use the exact routes/payload in Company OS integration-guide's consolidated form activation section. Stop on unexpected state; do not blanket-reapply the recipe or touch invitation/email/automations. This local work authorizes no hosted PATCH.
6. Verify actual production API tag/source, installed schema containing `approval_requirements`, module provenance and the two settings. Update the checked `company-os.json` minimum accordingly; no receipts are recorded. Department and custom activation can be sequenced independently, with their own prerequisites.
7. After test acceptance and production API/settings verification, set the actual frontend release version. Only after applicable acceptance/approval, set environment variables through authorized normal configuration (not done here), run exact-head CI and deploy frontend test. Require both the public custom flag and runtime guard `1` for activation. Verify live packaging, actual Clerk, responsive editor/review/privacy and neutral images without touching real users or sending mail. Repeat production's normal tagged guarded frontend release and permitted read-only canary; do not publish personal content. Invocation/configuration and hosted mutations require their existing release/operator authority.

## Rollback

Prefer a new guarded deployment hiding custom UI (`CUSTOM_SERVICE_REVIEW=0`) while keeping runtime guard `1` and feature API/module/settings. If the server variable is omitted, this candidate preserves it; explicit reset0 is refused. Do not roll back to an old frontend tag whose IaC omits the guard, or old API source that ignores `approval_requirements`, while affected pending profiles exist. A new checked rollback release should retain enforcement and declarations; rollback is not a manual tag/history rewrite.

Retain optional-position metadata for existing blank Department values. Reverting its UI flag restores the older editor's requirement and can block submission of such profiles: prefer retaining Department retirement until a reviewed compatible fallback exists. Never fabricate a role or reset/delete records to make rollback fit.

Before any deeper downgrade, perform a bounded authorized read-only inventory of affected pending/approved profiles and historical fields, establish a reviewed drain/compatibility plan and retain supported server protections. Do not clear custom requests, change visibility, assign catalog services, delete/migrate media or reset a database. Existing approval also publishes eligible profiles; separate approve/publish permissions are not implemented here. The visible-service check is an approval-transition guard, not an invariant against later visibility-only edits.

## Rollback once video links or profile details have been on

Once `PROFILE_VIDEO_LINKS` (or `PROFILE_DETAILS`) has been on, roll back by deploying the **same 1.4.x tag with the flag off** (set the variable to `0` and re-run the deploy), never by deploying 1.3.0. The 1.3.0 editor's save writes its own work-sample list and so deletes the stored `video_link` items, and it ignores `public_details` (rates, LinkedIn), which the next save would then leave stale or lose. With the flag off, 1.4.x stops showing the new fields but does not send the older shape over the stored data. Answers that an older build kept only in the browser (mobile number, work samples) are read once into the draft and cleared by the next save, so a flag-on window loses nothing.

## Scope and preserved state

The reviewed pair7d8a76a/49e67bf remains untouched. Activation work is isolated; no live settings, flags, records, releases or email were changed. Existing source-publication denial, tag403 and hosted-isolation gates remain. Potentially unpushed original-worker work is unrecovered. Full receipt, tests and private recovery bundles accompany the local handoff.

Playbook impact: IN-279 (Company OS activation audit).

## Nonblocking location/travel successor

Location12–14 compatibility now uses the generic creation-cohort rule and per-environment future cutoffs described in [Legacy blank-travel compatibility](handoff/patti-travel-cohort.md). This successor needs an actual feature-bearing API/module release; the earlier metadata-only location baseline is insufficient. Pending cutoff and release declarations refuse activation. No global required travel, backfill, real dates or new credentials are configured.

Current numbers: the activation steps are in [handoff/publish-gate.md](handoff/publish-gate.md): API 1.17.0 (`/health`), profiles module 1.10.0, activation follow-up web release 1.4.2 (1.4.1 was the public-pages fix), `requires` `>=1.17.0`. On test the backend recipe is already applied by test deploys, so only the website flags remain there.
