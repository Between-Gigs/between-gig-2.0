# Gigster profile adjustments — November 18

Justin approved the revised Skills & Experience preview with separate selected and suggested chips. This change keeps the existing profile fields and backend payloads. Selected skills have their own tinted panel; outlined suggestions have explicit add labels and exclude already-selected skills. Comma, Enter and pasted lines commit batches atomically. Existing raw skills remain untouched. The three editor fields can be rearranged as a browser-only preference; the public profile places skills and experience before services.

Availability has its own heading and a prominent high-contrast control. Generic Minimum Booking controls, presentation and requirements are retired under Justin's clarification that current records are testing data; stored fields remain intact. Optional hourly minimum hours and project minimum price remain. International phone formatting occurs only on edits, with a country selector, shared-code selection and punctuation-aware deletion. The private contact and error associations remain private and accessible.

The URL records edit/preview mode and updates the current navigation link without discarding the draft. Public work details use labeled rows and exclude private contact and insurance notes. Selected credits use separated rows.

Valid video links show provider thumbnails immediately, with a fallback. Explicit custom-thumbnail edits crop to supported JPEG bytes. Editing a different video remounts the form and invalidates pending thumbnail work. Any sample-list mutation invalidates the edit form to avoid a stale save target. The original video and portfolio photos are never rewritten by thumbnail cropping.

## Boundaries

Portfolio follow-up: photo reads are tied to their collection revision. Reorder, remove, replace, video edits and cross-tab updates invalidate delayed photo decoding instead of restoring an old list. A newer photo selection supersedes an older one. An open alignment dialog closes when its collection changes and cannot silently move to another photo; changing away and back does not resurrect the old dialog. Media state remounts for a different profile identity. The focused `scripts/qa/portfolio-edit-guards.mjs` regression uses delayed fictional image responses and cross-tab updates at phone/desktop widths in both themes. This does not add the missing live presentation contract described below.

Live portfolio-photo alignment with video links enabled is still blocked by the current API contract: there is no durable nondestructive file-presentation field. Adjust is restored in local sample mode; it is deliberately unavailable for that live combination. No backend metadata, schema, tenant settings or permissions change is included. Do not claim sample alignment or sample persistence as hosted verification. An additive file presentation contract and reader allowlist would need separate backend coordination.

The service catalogue is separate draft PR82. Its new video-editing option is absent from both BG tenant configurations, so it remains held. This change does not include that catalogue, invitation artwork, diagnostic email controls or navigation mode changes. No messages or emails are sent.

## Verification and release

`node scripts/qa/gigster-priority.mjs` exercises fictional local state at 320/390/768/1440 in both themes. It checks skills, arrangement/reload, availability contrast, phone/country/caret, preview/history/privacy and exact unrelated saved fields. With profile feature flags enabled, it additionally checks thumbnail crop/cancel, switching video targets during image work, stale-target removal/reorder, and phone error associations. Provider image responses are intercepted fixtures. Default Signup checks run this script and retain screenshots; the feature-on matrix was also run locally. Unit/contract checks cover batching, layout, phone, public work details, minimum retirement and thumbnail input validation.

Two independent source reviewers identified the video edit-target bug and phone error-association regression; both were corrected before final review. Use exact remote commit CI before integration. Reconcile SiteHeader logic with the separate navigation-mode PR100 when it is integrated. Keep Railway test and production as release targets; do not re-enable retired Pages settings.

No production release is established by this document. Follow Cut release and Deploy web (prod) with an annotated main-branch version tag and the required Company OS release. Coordinate the package version and runtime dispatch with the ongoing diagnostic release. Record exact commit, CI, Railway result and HTTP verification in the release receipt. Roll back through the previous approved release tag if needed.

Playbook impact: none.

## Showcase photo-fit follow-up (isolated, not released)

The frontend now bridges photo `#fit=cx,cy,z,a` presentation to optional Company OS `file.data.image_fit`, without changing photo bytes, media IDs or lightbox source. The editor enables Adjust alongside video links. Existing PR107 collection-revision, latest-selection and profile-identity guards are unchanged. Only photo files receive alignment; video thumbnails retain their separate behavior.

Wire contract: four finite decimals (at most four decimal places), centers 0–1, zoom 1–4, aspect greater than zero. Invalid incoming fit fails explicitly, rather than silently dropping a sample. Invalid/missing stored metadata renders the original. An absent fragment preserves existing metadata for older clients; saving a default centered fit explicitly resets the visual alignment. Backend null means cleared. New photos upload original bytes and confirm first, then PATCH the confirmed file. Metadata failures are surfaced, never swallowed as a best-effort ordering change. A successful generic PATCH must return the requested canonical fit in the authorized file row; missing/wrong metadata fails as `image_fit_not_available` before further existing-sample mutations; a failed new-photo fit removes that newly uploaded file best-effort to avoid duplicate retries. Multi-step sample saves are not transactional; existing successful earlier mutations may remain on failure.

Fit is reviewed content. Existing publication transitions and reader row policy remain backend-owned: a public owner edit must return to review, and unsupported staff/review-disabled changes must fail with `photo_fit_requires_review`. UI messages also cover `invalid_image_fit` and `image_fit_not_available`. No reviewer permissions, tenant settings, upload contract or live data are changed here.

Release prerequisite: coordinated Company OS files 1.2.0 / profiles 1.11.0 (final API release tag pending), schema synchronized, safe published-reader metadata projection and test-environment readback verified. Do not deploy this frontend before backend readiness is proven. Authenticated production save/reload and published-profile acceptance remain open. Local tests are not production evidence.
