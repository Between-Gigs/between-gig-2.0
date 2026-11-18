# Existing-service guidance and custom conversion

This independent slice addresses Justin's November 18 request to use Patti's service information and make Other accessible in the dropdown. It extracts the seven existing categories' 21 approved examples and seven taglines from reviewed catalogue PR82 (head 25437c9536997a6d71333f39f5c2001a9d365ec1). Examples appear in optional expandable guidance beside the Gigster's personal answer; opening them never writes profile data. The generic artwork/party example is removed from the current editor. Existing standard descriptions remain intact.

This is a partial catalogue delivery: labels, taxonomy, saved values and backend keys do not change. No Video Editing & Digital Content option is offered. Full catalogue PR82 remains held pending verified active tenant configuration; its remaining labels/category work must be reconciled with this slice rather than replacing the newer editor wholesale. Laundry, distinct Hair/Makeup answers, unknown legacy values and all personal wording remain readable and unchanged.

Other is available on both new and existing current-editor row dropdowns. Explicit conversion moves that row's exact personal wording into the existing private services_other field and preserves all remaining service order/lines. It replaces a slot, so five selected rows can convert without creating a sixth. Existing custom text cannot be overwritten; an unknown current service remains selectable. Custom-only submission and review flags/validators remain unchanged and are not activated by this UI. No permission, sending, publication or backend operation is included.

Live-profile conversion uses the existing warning and one atomic draft action. The pure state reducer checks against actual queued state when confirmation is applied, refusing stale service answers with a retry message. Only successful committed conversions mark services, serviceLines and other for autosave and move focus to the custom name. Cancelling leaves fields and local row visibility unchanged. Normal draft setters retain functional-updater ordering. A narrowly scoped lint exception allows consuming the committed transaction result once, keeping autosave/focus effects outside the pure reducer.

Renaming existing custom text preserves its exact multiline or over-limit description; the current 120-character cap applies only when the user edits the description. This preserves old data without relaxing submission validation. Original uploads, profile publication, feature flags, service API mappings and live grants remain untouched.

Verification includes helper/reducer/field mapping/validation/custom-only contract tests; actual-editor browser guidance, exact unrelated field preservation, conversion/autosave/reload/limits, unknown legacy values and long-description name editing at 320/390/768/1440 in both themes; plus an isolated fixture rendering actual CanvasHelp, useLiveEditWarning and the same reducer at 320/1440 in both themes. The fixture forces the existing warning parameter; it adds no product test hook. It tests cancel, confirm/focus and a newer queued edit immediately before confirmation. All data are fictional local fixtures. Authenticated hosted save/reload remains separate coverage.

Reproduce after a sample build:
- node scripts/qa/service-guidance.mjs
- node scripts/qa/service-conversion-guard.mjs
- node scripts/qa/other-service.mjs

Capture folders: deliverables/service-guidance and deliverables/service-conversion-guard. Require independent final-tree reviews, exact-head CI, current-main test deployment and the normal annotated-tag production workflow. Source package 1.6.7 is a candidate until the release receipt establishes actual deployment. Company OS requirement remains >=1.20.0. Rollback uses the previous checked frontend tag; no data restoration or backend downgrade is needed.
