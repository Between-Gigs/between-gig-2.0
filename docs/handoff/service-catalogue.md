# Patti's 17 November service catalogue

Implements the approved eight categories, 24 complete example titles/descriptions and eight taglines in the existing Gigster editor. The category picker uses current names. Examples are expandable guidance, separate from the Gigster's editable answer. Other is available in new and existing-row dropdowns; changing a row to Other carries its personal line into the custom answer and reserves the same slot. Nothing is auto-published.

## Compatibility

Existing service values and keys remain stable. Parties & Event Planning uses `Event Styling` / `event_styling`; Photography & Videography uses `Photography & Portraits` / `photography_portraits`; Beauty, Hair & Makeup uses `Beauty & Personal Styling` / `beauty_personal_styling` for new selections. Existing `Makeup Services` / `makeup_services`, `Hair Styling` / `hair_styling` and `Wardrobe & Laundry Care` / `wardrobe_laundry_care` remain decoded, displayed and saveable. Existing separate Beauty rows are not collapsed. Exact personal-line keys, custom Other text and order are retained. Historical raw labels match existing save-diff rows so unrelated saves do not recreate them. Retired options are omitted only from new choices. Aliases are included in sample/server filtering and public text search.

## Release prerequisite — hold merge until verified

The new category requires an active **Between Gigs** tenant `profile_option`, kind `service`, key `video_editing_digital_content`, label `Video Editing & Digital Content`, position `10`, active `true`. The current Company OS recipe does not contain it. Company OS rejects new service values without an active matching option (`invalid_option`). This is additive tenant configuration, not a schema change. Coordinate that configuration and its durable recipe update with the backend owner, and verify it in both Railway test and production before releasing this frontend. Preserve all historical options as active so old profiles keep saving and remain searchable. Do not bulk re-seed, re-import people, rewrite profile items or modify another tenant.

No Company OS repository, tenant configuration, real profile, HOY resource, release tag or deployed runtime was changed by this frontend PR. The new option must be verified through a permitted BG-only configuration/read route; recipe source alone is not proof of live state.

After compatibility is verified, rebase/check concurrent visual-polish changes, run the final CI on the exact head, merge under Justin's standing approval, bump through the standard reviewed release process, use Cut release and Deploy web (prod) from its annotated tag, and verify Railway test/production. Merge alone does not deploy production. Do not restore Pages as a preview/release route.

## Verification

Unit regression tests cover all eight choices, 24 guidance entries, legacy aliases, old/new serialization, exact personal lines, custom text, no-op repeated saves, and position-only reorder operations. Browser QA `node --experimental-strip-types scripts/qa/service-catalogue.mjs` covers all copy in the rendered current editor, dropdown keyboard/Escape behavior, save/reload, legacy rows, Other conversion/entry/removal, max slots, interrupted/repeated picker flows, explicit remove/re-add, unrelated-field preservation and responsive light/dark layouts. Its screenshots are local fictional sample evidence, not hosted persistence or publication evidence.

The current source of catalogue copy is Justin's approved parent-thread message quoting Patti's email, forwarded November 17, 8:55 AM PST, subject “Fwd: Service categories and descriptions”. Library materialization previously failed; this direct approved source supersedes that access blocker.

Two independent source-review rounds completed. Round 1 fixes confined the new labels to services and covered older editor labels/legacy choices; round 2 fixes preserved descriptive help text and updated empty-position fallbacks. The second reviewer rechecked the final fixes and reported no implementation blocker beyond the backend active-option prerequisite.

Local evidence: all eight browser viewport/theme cases (320, 390, 768, 1440; light/dark) passed the catalogue workflow; the existing Other-service and service-order suites also passed all eight cases. Desktop and mobile screenshots are under ignored `deliverables/service-catalogue/`, labeled LOCAL-NOT-LIVE. TypeScript, ESLint, token checks, static build/page checks, standalone server build, preview build, bundle/security/route checks and sample code-split checks passed. The standalone build needed workspace-local TMPDIR because this executor's `/tmp` crosses filesystems and the existing staging copy's hard-link fallback nested dependencies; no build script was changed to bypass a check. Live persistence and active tenant configuration remain unverified.
