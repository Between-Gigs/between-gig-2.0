# Hub cleanup

The Hub has independent thumbnail/full-height preview controls for each section, with thumbnail defaults and per-section saved preferences. Full-height frames measure their actual document; the existing lazy queue and bounded frame cache remain in use. Preview frames stay inert and keep isolated sample storage.

Edit your profile previews use Elena's draft identity; Profile submitted previews use Imani's submitted identity. Their card actions also enter the appropriate fictional account before opening the page. This fixes protected-route login redirects at the source rather than substituting screenshots or covering login screens.

Design system is the final Hub section. The sample profiles section is named Sample Gigster Profiles. Scratchpad opens the existing draft homepage, with the deployment's base path applied by Next Link. Sign up v1, Log in v1 and Profile editor v1 are removed from Previous designs; their files and direct URLs remain for recovery.

Concurrent main commit 306e055 removed the home-peter draft while promoting its direction independently. This change preserves that main update and its Coming soon v2 archive, and restores the exact isolated draft files from 8a286c9 so the explicitly requested Scratchpad URL remains usable. The production homepage is not edited by this change.

The welcome/Storyboard and Coming soon email templates are removed from active email discovery and the Studio/workspace catalog. Their renderers, assets, direct URLs and historical outbox records remain. Sending behavior and broadcasts are not changed.

Invitation PR #28 is separate. Its hero/copy/footer changes are not included here. That PR also changes two invitation/account navigation entries in Overview and a journey registry entry; those entries are left intact in this Hub change so the invitation can be finished and reconciled afterward.

Verification: `scripts/qa/hub-cleanup.mjs` inspects actual rendered profile frames, verifies their paths and isolated viewing session, checks section-local height controls and saved preferences, exercises arrow-key selection, runs axe, checks responsive overflow and archive recovery, and captures submitted-state/Scratchpad screenshots. Existing guide appearance QA compares real thumbnail typography/layout with the opened pages. Browser checks are performed on fictional sample data only.
