# Publish gate (Q1): "Approved, not yet public"

`NEXT_PUBLIC_PROFILE_PUBLISH_GATE=1` (deploy variable `PROFILE_PUBLISH_GATE`) switches the wording and visibility rules to the API's publish gate (API 1.17.0, profiles module 1.9.0, option `publish_after_approval`). Default OFF: every screen reads and behaves as before.

- Status `published` is added. With the gate on, `approved` is private and only `published` is public ("Live").
- Gigster: approved reads "Approved, not yet public" with the line "The Between Gigs team approved your profile. It goes public when we launch the directory." and "Changes you make here go back to the team for review." No email on approval.
- Owner: Approve stays "Approve"; approved people read "Approved, not public"; "Live profiles" counts published only; an "Approved" count is added. No publish button yet (the bulk publish screen is the next phase).
- Public pages and the public list render only public statuses (`lib/profile/publish-gate.ts`).
- Activation: the publish gate needs profiles 1.10, checked at deploy by `/healthz/` (see "How the deploy checks the backend" below). The top-level `requires` stays `>=1.17.0`: this release's ungated behaviour (insurance notes, free-text postal codes for other markets, service counting) needs API 1.17.0, so deploy API 1.17.0 first (rule E9).
- Deliberate activation: this release has **no publish action**, so with the gate on nobody goes public. The preflight refuses `PROFILE_PUBLISH_GATE=1` unless the deploy variable `PROFILE_PUBLISH_GATE_ACK_NO_PUBLISH=1` is also set (test and production). Set both together, on purpose, when the owner wants approvals private and nothing published at launch; remove the acknowledgement requirement only in the release that ships the publish action.
- Funnel stage "Approved" counts approved plus published; its list link shows approved only.

## Activation order with the backend (release steps)

Never turn on one half of the gate. The website flag and the backend option are a pair: the flag alone hides approved profiles that the backend still treats as public; the option alone leaves the website showing "Approved" as live.

1. **API 1.17.0 deployed and synced** to the environment (Company OS *Deploy API (test)* / *(prod)*; module sync installs profiles 1.10.0). Verify: `/health` reports 1.17.0 and the installed profiles module is 1.10.0.
2. **Backend recipe step turns `publish_after_approval` on** (Company OS integration guide, publish-gate section; supported settings PATCH, read before write, change only that option). This also converts the already-approved profiles to `published`, so the profiles that are live today stay public. Verify before step 3: the people list for the tenant shows no `approved` profile that was public before; count `published` equals the previous live count.
3. **In the same window**, set the GitHub environment variables `PROFILE_PUBLISH_GATE=1` and `PROFILE_PUBLISH_GATE_ACK_NO_PUBLISH=1` and deploy the website (test: *Deploy web (test)*; production: *Deploy web (prod)* from the tag). `check-profile-activation` refuses `PROFILE_PUBLISH_GATE=1` without the acknowledgement and without the declaration below. Do not leave a gap between steps 2 and 3, and never set `PROFILE_PUBLISH_GATE` on its own.
4. **Verify** on the deployed site: a profile that was live before is still on the public page and the public list; the owner dashboard counts it under "Live profiles"; a newly approved test profile reads "Approved, not public" and has no public page.
5. **Roll back as a pair**: variables off and a website deploy first, then the backend option off. Not the other way round.

### How the deploy checks the backend (no receipts)

Nobody records a receipt any more. The deploy checks automatically in two places:

- `scripts/check-profile-activation.mjs` (before any build) refuses a flag value that is not absent, 0 or 1, the publish gate without `PROFILE_PUBLISH_GATE_ACK_NO_PUBLISH=1`, and a location cutoff that does not match `company-os.json` `travelRequiredAfter`.
- The server's `/healthz/` asks Company OS what the public reader can see and answers 503 (naming the feature) if a flag is on but the backend lacks the profiles-module version it needs. Railway's deploy healthcheck then keeps the old version serving. Details: `lib/server/backend-readiness.ts`.

What stays manual: the backend `publish_after_approval` step (production deploys do not apply the recipe; do it before turning the website flags on). To switch the flags on, set the variables and run *Deploy web (test)* / *Deploy web (prod)*.

**Test environment.** Test deploys of the API apply the recipe (`deploy.test_tenants_setup`), so `publish_after_approval` is already ON in the test backend while the test website flag is off. On test only the website half remains (the 1.4.2 flags); the backend recipe step is not needed there. Production deploys do not apply the recipe.

### Rollback note

If `PROFILE_VIDEO_LINKS` or `PROFILE_DETAILS` has been on, never roll the website back to 1.3.0 (its save deletes stored video links and ignores `public_details`): deploy the same 1.4.x tag with the flag off (docs/profile-form-activation.md, "Rollback once video links or profile details have been on").


Note: Company OS `v1.16.0` is a Hoy-only release cut on 16 Nov; the Between Gigs profile work ships in `v1.17.0`.

Note: web 1.4.1 (PR #71 plus version PR #72) is the public-pages fix for the 1.4.0 bug and is already deployed; the activation follow-up (flags) is therefore 1.4.2.
