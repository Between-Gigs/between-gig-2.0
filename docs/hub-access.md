# Verified access to the Developer Hub

The production server serves Hub documents only after checking the current real
session with Company OS `GET /me` and receiving a valid identity with
`isSuperAdmin === true`. It reads the same Bearer token or Clerk `__session`
cookie as existing protected server routes. An iframe GET uses the real same-origin
session cookie; no local-storage, sample-role or developer-mode handoff authorizes it.

The Developer Hub entry is `/owners/developer/`. Its owner-gated UI embeds the
fictional sample export at `/hub/?embedded=developer`; the server gate applies
independently to that request. The static export remains fictional and must not be
described as real customer data or live database edits.

## Responses and scope

- Missing, expired or malformed credentials redirect to the fixed safe login
  destination `/login/?next=%2Fowners%2Fdeveloper%2F`.
- A verified non-super-admin receives 403. Backend, configuration or identity-schema
  failures receive 503 without exposing upstream details.
- Every document request rechecks the current identity, so revocation and sign-out
  do not wait for a separate preview cookie to expire.
- HTML, explicit `.html` paths, legacy `/preview/` aliases, fallback 404 HTML and
  Next RSC/text/JSON documents follow the same policy for GET and HEAD. Canonical
  redirects retain their original query parameters after authentication.
- File classification uses the canonical real file inside the export root. A
  symlink named like an image cannot expose an HTML target; links outside the root
  remain refused.
- Non-sensitive static JavaScript, CSS, images, fonts and video files retain their
  existing read behavior. Other document formats require authentication.
- Document and authorization responses use `private, no-store` and
  `Vary: Cookie, Authorization`. Successful documents retain the hashed-script CSP,
  same-origin framing and no-index headers.

`bg_preview` is a legacy compatibility cookie. Even a freshly signed one grants
no Hub document access. The existing passphrase test-gate exemption only permits
requests to reach this independent session gate; a passphrase does not grant Hub access.

## Verification and rollout

`lib/server/preview.test.ts` exercises signed-out, member, super-admin, expired and
malformed sessions; strict identity validation; current role revocation; aliases,
RSC, HEAD and fallback pages; resolved-file symlinks; asset reads; and cache headers.
`scripts/check-server.mjs` checks signed-out redirects against the standalone
server. `scripts/qa/server-hub.mjs` uses an isolated loopback-only fictional
Company OS verifier to test browser navigation, cookies, revocation and sign-out.
It neither uses real accounts nor calls a live backend.

The server gate and the owner-gated entry must be integrated and reviewed together
before release. No release, deployment, backend write, email send or invitation
template publication is performed by this source change.
