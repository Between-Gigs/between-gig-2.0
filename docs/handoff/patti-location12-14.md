> Historical global-required candidate retained for provenance. For the current nonblocking rollout use [Legacy blank-travel compatibility](patti-travel-cohort.md). Do NOT activate the old global `travel_notes` requirement; it is superseded by the dormant creation-cohort successor. Original bf625a34/265a1650 candidates remain untouched on their own branches.

# Patti location12–14 — local integrated candidate, not live

Scope: canonical Gigster editor removes Areas you serve; Travel radius is required and offers exactly Up to 5 miles, Up to 15 miles, Up to 25 miles and Up to 50 miles. No beyond-LA checkbox (item15), new consent, rate model, custom taxonomy, auth, invitation, dashboard or media change. Those remain separate. This branch derives from the reviewed activation pair, whose worktrees/commits/bundles remain untouched.

`NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS=1` explicitly selects the new UI; absent/0 preserves existing live AND sample behavior. Normal deploy workflows forward GitHub environment variable `PROFILE_LOCATION_CONTROLS` in both their preflight and deployed build. No environment variable was set by this work. `company-os.json.profileFeatures.locationControls` stays null for actual deployed API source/per-environment settings receipt, so activation refuses until the existing release/operator gates pass. Simultaneous features must identify the same API source. A receipt reference is an operator attestation, not an automated live capability probe.

New blank travel answers have no default and cannot submit. Four selectable choices store unchanged in existing `travel_notes`; no new field/schema/enum/API code. Old nonblank free text remains readable as a disabled previous-answer option and remains valid until the owner explicitly replaces it; it is not silently normalized or truncated. Backend intentionally accepts nonblank legacy text, so four UI choices are not a universal server enum. Previous areas stay in draft/storage/public rendering and are not deleted merely because their input is hidden. New LA profiles can submit without areas; outside-LA city/region/country validation remains. No change to future-market invitation or publication policy is claimed.

Required travel propagates through default and saved templates, direct older in-memory templates, errors, checklist, completeness and editor required labels. Unknown/duplicate malformed template settings still refuse before normalization. The sample template editor cannot turn off required travel in this mode. Existing Transport/Department retirement semantics remain unchanged.

Public location rendering previously hid the identity location line and its travel note when an LA profile had no areas. New mode supplies only the generic 'Los Angeles area' fallback through the shared profile model, retaining historical area labels and old-mode behavior. No ZIP/private city/insurance/custom-service text is made public.

## Backend requirement and compatibility

Only new production metadata delta adds `travel_notes` to Between Gigs `submit_requirements`. Existing requirements, optional Department and custom-service approval guard in this combined candidate are preserved. Generic defaults/other tenants/public fields/permissions/API/module versions unchanged. No SQL migration or data conversion.

Local real-DB proof: blank travel refuses submission; all4 exact strings and old free text round-trip; no-area LA submits; self/foreign and public/private boundaries remain; atomic approval guard/file rollback remains. Under newly required metadata an older approved profile with blank travel refuses unrelated content edits422 with profile/files unchanged. Availability-only edit still succeeds; an explicit travel answer allows return to review and approval. Do not autofill a fabricated choice or delete history to avoid this contract.

## Activation order and rollout gate

The earlier activation runbooks remain in force: invitation retains release priority; public-source upload denial and tag403 cannot be bypassed; no real-service mutations until isolation/authority established. Test DB/Clerk/storage/mail safety must be proved with supported existing access. Original-worker unpushed-work gap remains unrecovered.

Location-only activation needs no invented new API minimum or profiles1.5 dependency: existing generic required TEXT supports this. Verify the actual deployed API source/settings through existing authorized SuperAdmin/owner/operator access, including no unexpected required `area`, and that `travel_notes` exists. Do not infer this from /health, a module number or a version label.

For an independent location-only settings change, supported PATCH updates ONLY `settings.submit_requirements`: preserve the observed existing list and add `travel_notes` once. Do not remove position, change approval requirements or replay the combined recipe unless their separate reviewed gates already passed. The canonical full combined payload may include the separate Department/custom-service changes; label it combined, never pretend those are dependencies of location alone. Production API deploy syncs modules but not recipe settings; test recipe application can warn and leave old settings. Read before write, stop on unexpected customization, read back and save a sanitized environment-specific receipt.

Stage/check the candidate and test-compatible inputs first. In a clearly isolated test environment, apply/reconcile only reviewed metadata, record TEST-only source/settings evidence, update checked declarations and deploy the frontend to TEST before real Clerk acceptance. Exercise both new blank profiles and older approved blank/nonblank profiles, old UI fallback/client behavior, refusal/recovery/autosave/file atomicity, self/foreign roles, submit/review/approval/public/privacy and neutral images. Existing old-mode free-text input remains available; its successful explicit-answer recovery and error visibility need real-service acceptance. No fake/sample check replaces this.

Only after that acceptance and required publication/release approvals, plan production settings application and source receipt followed by the activating checked frontend release. The metadata → receipt → public flag/build/deploy transition is NOT atomic. New required metadata can temporarily refuse blank legacy content saves while the older UI labels travel optional; explicitly accept/mitigate that window with a compatible input/recovery plan and bounded read-only affected-profile inventory before applying. If no safe window/fallback is established, leave production metadata unchanged. No metadata patch, profile inventory or production activation occurred here.

## Rollback

Retain a compatible travel input. Hiding the new controls alone does NOT remove the backend travel requirement; old UI may still mark it optional. A separately reviewed requirement rollback removes ONLY `travel_notes` from the observed required list if needed, preserving all other requirements, optional-position metadata and the server/API custom-service guard. Read before write and verify afterward. Do not automatically clear values, areas, media, assign taxonomy, rewrite consent, backfill profiles or reset data. Runtime `CUSTOM_SERVICE_REVIEW_ENABLED=1` remains enforced while pending custom-only requests exist; new public custom UI can be hidden independently. Department retirement should remain until a compatible fallback handles existing blank roles.

No FE/API release versions allocated here. Exact heads, test results, independent reviews, local recovery paths and private artifact receipts are in the integration handoff.

Playbook impact: IN-281, avoiding IN-280's separate unreleased video proposal.
