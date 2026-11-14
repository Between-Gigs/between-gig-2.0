# Own-profile entry

The guarded /profile/ view waits for the signed-in person's existing summary and submitted snapshot. New people and empty drafts then replace the route with /profile/canvas/ while keeping a loading state, so the empty welcome interstitial never renders. A saved optional answer counts as a real draft even when required-part completeness is zero. Existing draft/review/approved profiles retain their own status/profile view and Edit action. Submitted snapshots, identity, publication and API authorization are unchanged.

The same component and resolver serve sample and API data sources. Login keeps explicit safe next destinations and owner fallback behavior. Validation runs again after removing the deployment base path so it cannot disguise a protocol-relative destination. Signup still uses the editor, and /profile/canvas/ does not redirect back to /profile/.

QA uses fresh fictional sample contexts for new/empty, draft, submitted, changes-requested and approved entry at phone/desktop widths, actual sample login, explicit next, rejected external next, owner and signed-out guards. The isolated Clerk SDK contract checks returning identities and base-path redirects. These checks do not establish live OAuth or real-account/backend behavior; no provider, credential or security configuration is changed.
