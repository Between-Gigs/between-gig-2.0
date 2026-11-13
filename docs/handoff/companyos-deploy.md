# Deploying 2.0 next to Company OS

2.0 runs as a Next server in Railway project **"Between Gigs OS"**, service `web`, next to Company OS's `api`, and
calls the API server-side over Railway's private network (Company OS decision log N-03). The GitHub Pages preview
stays as it is: a static export on the sample data, every route.

## Three builds

| | GitHub Pages preview | Server (test and production) | The server's /hub/ |
| --- | --- | --- | --- |
| Command | `pnpm build` | `pnpm build:server` (sets `BG_BUILD=server`) | `pnpm build:preview`, after the server build |
| Output | `out/` (static export, base path `/between-gig-2.0`) | `.next/standalone/` (Next server) | `.next/standalone/preview-site/` (static export, base path `/hub`) |
| Routes | every route | 21 live app routes, including Staff and the legacy Hub entry | every route, on the sample data |
| Data | sample | `NEXT_PUBLIC_DATA_SOURCE=api` on test and production: the sample is not in the bundle (`lib/data/selected.ts`) | sample only: no Clerk key, no data source, never calls Company OS |
| Headers | none (Pages can't set them) | CSP with a per-request nonce, HSTS, nosniff, … | its own CSP (inline scripts, `frame-ancestors 'self'`), `X-Frame-Options: SAMEORIGIN`, noindex |
| Workflow | `pages.yml` (unchanged) | `deploy-test.yml`, `deploy-prod.yml` | the same, in the same step |

### Public Hub during Clerk testing (owner, 12 Nov 2026)

The canonical Hub is /hub/. The old /preview/ entry and its descendants redirect into that namespace; /preview-access forwards safely to the Hub without requiring a session. This supersedes the earlier superadmin-cookie gate during testing. The legacy grant endpoint remains protected, but its cookie is not required to read the Hub.

The server mounts a separate static sample build under /hub (lib/server/preview.ts). Its root page is the Hub; the original sample home remains at /hub/home/. The temporary build copy changes those routes without altering the Pages export or the real app. Nested sample tools use the same mount, CSP hashes and filesystem-containment checks. No Clerk key, Company OS URL or service credential reaches this sandbox.

The Hub is publicly accessible for testing, while real /owners/* and /api/staff/* remain protected by the existing test gate and verified Company OS superadmin session. Navigation between the live app and this separate static build uses full-page navigation. See [Hub, experiences and staff](hub-staff.md).

Pages and Railway test both follow main through their existing checked workflows. Production is still manually released.

### Code splitting

`scripts/check-split.mjs` (in `pnpm check:server`) fails the build if a public site page (`/`, `/professionals`,
`/storyboard`, the legal pages, `/p/[slug]`, `/join`, `/login`, `/preview-access`) loads dashboard code
(`components/owners`, `builder`, `canvas`, the profile editor's parts), or, on a live build, if any page ships the
sample data. A live build swaps `@/lib/data/selected` for `selected.live.ts` (`next.config.ts`), so the sample store
is never bundled. Staff uses the equivalent live-only alias for `@/lib/staff/selected`.

### The test gate (test only)

The test site is on the public internet, so `proxy.server.ts` puts a passphrase in front of it
(`lib/security/test-gate.ts`, Company OS playbook rule D5). It is on when `TEST_GATE_PASSPHRASE` is set:

- Without its cookie, a page answers 401 with the passphrase form, and `/api/*` answers 401 JSON.
- The right passphrase sets a signed 30-day `bg_test_gate` cookie and returns to the page asked for, query included.
  A new passphrase signs everyone out.
- 5 wrong tries in 15 minutes from one address get 429.
- Exempt: `/webhooks/resend/` (signed by Resend), `/email/*` (mail clients fetch the images without a cookie), and
  `/healthz/` (Railway's healthcheck), plus GET/HEAD reads of `/hub/*`, `/preview/*`, and `/preview-access/` while Hub testing remains public.
- Everything behind it is `noindex`. Without `COOKIE_SIGNING_SECRET` it answers 503 (fail closed).

`deploy-test.yml` refuses to run without both secrets; `deploy-prod.yml` refuses a `TEST_GATE_PASSPHRASE`, and the
gate ignores one on Railway's `production` environment anyway.

What it does not cover, on purpose: the build's own files (`/_next/static`, the favicon) load without the cookie, as
the pages need them. They hold no secret and, with the sample swapped out, no sample data. The attempt limit counts
per `X-Real-IP` (Railway's edge sets it, see below); without one, every caller shares a single bucket.
Testers need the passphrase before an email link opens for them.

`scripts/server-build.mjs` builds in a temporary copy of the working tree (what `git ls-files` lists, so committed,
changed and new files but no ignored ones such as `.env*`) without the internal and waiting folders (`INTERNAL`:
`app/workspace`, `app/studio`, `app/preview`, `app/hub`, `app/emails`, `app/crew-call`, `app/proposals`, `public/artifacts`,
`public/studio-source`, `public/thumbs`, `public/workspace`), so they 404 and are not in the output. The real tree is
never touched; only `.next` comes back. It fails closed: `pnpm test` fails on a page that is in neither `LIVE_PAGES`
nor `INTERNAL`, or a `public/` folder in neither `PUBLIC_LIVE` nor `INTERNAL`, and `check-server.mjs` fails on anything
else in the build output. A route that moves from "Waiting on the client" to "Make live" comes off `INTERNAL` and onto
`LIVE_PAGES` and `LIVE_ROUTES`.

Files named `*.server.ts` / `*.server.tsx` (the proxy, the API and media route handlers) exist only in the server
build: only it adds those page extensions. `scripts/check-pages.mjs` checks the Pages export has every page and none
of them.

`pnpm check` runs all three builds, `check-pages.mjs` after the export, then `pnpm check:server`:
- `scripts/check-bundle.mjs`: no `cos_svc_`, `sk_live`, `sk_test`, `CLERK_SECRET` or `*.railway.internal` in what
  browsers download, the preview export included. In its Studio source copy, only real secret values count.
- `scripts/check-server.mjs`: starts the server. Live routes 200, internal ones 404, headers and nonces on every page,
  `/healthz/` 200 and the public Hub/legacy aliases, with real app/API gates preserved. A second start with a passphrase checks the test gate.
- `scripts/check-split.mjs`: the code-splitting rules above.

### Security headers

- `proxy.server.ts` (seen only by the server build) sets the Content-Security-Policy on every request but the build's
  static files:
  scripts only by nonce with `'strict-dynamic'` (no `'unsafe-inline'`, no `'unsafe-eval'`), Clerk's Frontend API
  (read from the publishable key), Cloudflare's bot check, `img.clerk.com`, `frame-ancestors 'none'`.
  Styles keep `'unsafe-inline'`: Clerk injects its CSS at runtime. Every page renders per request so it can carry
  the nonce (`app/layout.tsx` reads it in the server build only).
- `next.config.ts` adds to every response: `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=63072000;
  includeSubDomains` (no `preload`), `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- Clerk's development telemetry (`clerk-telemetry.com`) is blocked on purpose; sign-in doesn't need it.
- **Owner's decision:** HSTS `includeSubDomains` applies to every `between-gigs.com` subdomain once a browser has
  seen it. Keep it only if every subdomain serves HTTPS; otherwise drop it in `lib/security/headers.ts`.

## Environment variables

**Build time** (built into the pages; public by design):

| Name | Value |
| --- | --- |
| `BG_BUILD` | `server` (set by `pnpm build:server`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_…` on test, `pk_live_…` on production (from the GitHub variable `CLERK_PUBLISHABLE_KEY`) |
| `NEXT_PUBLIC_DATA_SOURCE` | `api` (the workflows set it; unset = the sample data) |
| `NEXT_PUBLIC_SITE_ORIGIN` | the site's origin, for share images and canonical links: the GitHub variable `APP_URL`: `https://between-gigs.com` on production, `https://test.between-gigs.com` on test |

**Runtime** (Railway service `web`, `.railway/railway.ts`; server only, never in the browser):

| Name | Value | Set by |
| --- | --- | --- |
| `COMPANY_OS_URL` | `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}` (private network) | the IaC |
| `COMPANY_OS_TENANT` | `between-gigs-dev` on test, `between-gigs` on production (N-13) | the IaC |
| `COMPANY_OS_READ_TOKEN` | `cos_svc_…`, a read identity (role `public_reader`): public pages | workflow, from the GitHub secret |
| `COMPANY_OS_SUBMIT_TOKEN` | `cos_svc_…`, a submit identity (role `form_submitter`, mode `submit`): public forms | workflow, from the GitHub secret |
| `APP_URL` | the site's origin, `https://…`, no trailing slash (test: `https://test.between-gigs.com`) | workflow, from the GitHub variable `APP_URL` |
| `COOKIE_SIGNING_SECRET` | random, different per environment: signs the preview's and the gate's cookies | workflow, from the GitHub secret |
| `TEST_GATE_PASSPHRASE` | test only: the passphrase in front of the test site | workflow, from the GitHub secret |
| `COMPANY_OS_PROFILE_EXTRAS` | `1` once Company OS's recipe has the profile editor's tenant fields (docs/handoff/companyos-profile-extras.md); unset until then | the IaC or a Railway variable |
| `NODE_ENV`, `PORT`, `HOSTNAME` | `production`, `3000`, `0.0.0.0` | the IaC |

The platform key (`COMPANY_OS_PLATFORM_KEY`) is **not** on this service. It is only typed into a shell for the
one-time import below.

## What the owner sets up

1. **Railway:** nothing to create by hand. `web` is created by the first deploy in the project's existing `test` and
   `production` environments (Company OS runbook `customer-environments.md` §1). Production: after its first deploy,
   add the custom domain `between-gigs.com` to `web` (and the DNS records Railway shows). **`www.between-gigs.com`
   must 301 to `https://between-gigs.com`** (at the DNS provider or a redirect service), never be served by `web`:
   Company OS accepts Clerk sessions only from `APP_URL`'s origin, so a Gigster on `www` would look signed out.
2. **Service identities**, per environment, on the tenant (shown once; straight into the GitHub secret):
   `POST /platform/tenants/<tenant>/service-identities` with `{ "name": "2.0 public reads", "roleKey": "public_reader" }`
   and `{ "name": "2.0 public forms", "roleKey": "form_submitter", "mode": "submit" }`.
3. **GitHub environments** in this repo (Settings → Environments), created before the first run:
   - `test`: secrets `RAILWAY_TOKEN` (the test project token), `COMPANY_OS_READ_TOKEN`, `COMPANY_OS_SUBMIT_TOKEN`,
     `TEST_GATE_PASSPHRASE` (your choice, at least 12 characters) and `COOKIE_SIGNING_SECRET` (`openssl rand -hex 32`);
     variables `APP_URL` (`https://test.between-gigs.com`), `CLERK_PUBLISHABLE_KEY` (`pk_test_…`),
     `RAILWAY_PROJECT_NAME` (`Between Gigs OS`), `RAILWAY_REGION` (`us-east4-eqdc4a`).
   - `production`: the same names with production values (`pk_live_…`, the production token and
     identities, its own `COOKIE_SIGNING_SECRET`), plus the variable `APP_URL` (`https://between-gigs.com`), and
     **no** `TEST_GATE_PASSPHRASE` (the deploy refuses one).
   - **Protection, required** (a run uses the workflow file *from the ref it runs*, so the guard in
     `deploy-prod.yml` only holds if nobody else can make a `v*` tag):
     - `production`: *Deployment branches and tags* → tag pattern `v*` only; a required reviewer (you) if the plan
       offers it.
     - A **tag ruleset** on `v*` (Settings → Rules → Rulesets → New tag ruleset): restrict creation, update and
       deletion, with only the repository admins (you) and GitHub Actions (the *Cut release* workflow) allowed to
       bypass.
     - `test`: *Deployment branches* → `main` and `companyos` only, so no other branch's workflow file gets the test
       secrets.
4. **`company-os.json`:** replace the placeholder with the Company OS release that carries the bg-2 work and delete
   its `todo` line. Cut release and the production deploy refuse the placeholder; test deploys only warn.
5. **Order** (rule E9): first, in Railway, attach `test.between-gigs.com` to `web` (it exists already; in a fresh
   project the first deploy creates it and its smoke check goes red once, Company OS runbook `customer-environments.md`
   §5b) (a CNAME plus the
   `_railway-verify.test` TXT record exactly as Railway shows them; the TXT value starts `railway-verify=`) and set
   `APP_URL` (`https://test.between-gigs.com`) in the `test` environments of both repos. Then Company OS *Deploy API
   (test)* → this repo's *Deploy web (test)* (it ends with a check from outside that the address serves the gated
   site) → test the flows → Company OS *Deploy API (prod)* → *Cut release* here (bump `package.json`'s version first)
   → *Deploy web (prod)* from that tag. Rollback: deploy the previous tag.
   Last, remove the generated `*.up.railway.app` domain from `web`.

   On test, Company OS's `APP_URL` starts as the placeholder `https://placeholder.invalid` (its runbook
   `customer-environments.md` §8 step 3). Until the API is deployed with the real address, every
   email it sends (invitations, form notifications) links to `placeholder.invalid`, and it refuses invitation
   redirects to this site. Send no test email before that deploy; one sent earlier has a dead link and
   must be sent again.
6. **The first Super Admins** (owner's decision), at go-live, once production's `api` has `APP_URL` set to the
   real domain: the operator invites **Peter, Patti and the owner** as Super Admins, one call each, and hands each
   person **their own link privately** (a direct message to them, never a shared channel or email thread: the link
   signs them in). Rehearse it on test first with the tenant `between-gigs-dev` and the test address.

   The call is `POST /t/<tenant>/invitations` with the platform key, body
   `{ "email": "<their address>", "roleKey": "super_admin", "redirectUrl": "<APP_URL>/join/" }`. Run it inside the
   `web` service like the import (the only place that reaches the private API), typing the key and the address so
   neither lands in the shell history:

   ```bash
   railway ssh --service web --environment production   # --environment test for the rehearsal
   ```

   ```bash
   read -rs COMPANY_OS_PLATFORM_KEY && export COMPANY_OS_PLATFORM_KEY
   read -r INVITE_EMAIL && export INVITE_EMAIL
   node --input-type=module -e 'const r = await fetch(`${process.env.COMPANY_OS_URL}/t/${process.env.COMPANY_OS_TENANT}/invitations`, { method: "POST", headers: { "content-type": "application/json", "x-platform-key": process.env.COMPANY_OS_PLATFORM_KEY }, body: JSON.stringify({ email: process.env.INVITE_EMAIL, roleKey: "super_admin", redirectUrl: `${process.env.APP_URL}/join/` }) }); console.log(r.status, await r.text())'
   unset COMPANY_OS_PLATFORM_KEY INVITE_EMAIL
   ```

   - `201` with `url`: that is the person's link. It is shown only this once (Company OS never stores or logs it);
     copy it straight into the private message. Running the call again sends a new link and revokes the old one.
   - `409 already_signed_up`: they have signed in before and already have access.
   - `422 redirect_not_allowed`: the API's `APP_URL` is not this site's address yet (see step 5).
   - `409 role_mismatch`: that login already has another role in this tenant; change it in Company OS first.

7. **Open sign-up for Gigsters** (decision N-19, 2026-11-12). Company OS v1.12.0 first (`company-os.json` requires
   `>=1.12.0`). Reset the test tenant `between-gigs-dev` once, as Company OS's runbook `customer-environments.md` § "Giving an existing test tenant the seed" describes (module
   sync never removes a capability, so `provider` loses `profile.edit_own` only through the reset), then deploy the
   test API so the recipe re-applies its people settings (`self_signup` turns on at go-live). Set the test Clerk
   instance's sign-up mode to Public, with email verification and bot protection on. Production's Clerk instance is
   Public from the start, with the same two settings.

## Client IP behind Railway's edge (the per-IP rate limit)

The public forms' rate limit counts requests per client IP, read from `X-Real-IP` (`lib/server/routes.ts`). That
is only safe if Railway's edge **sets or overwrites** `X-Real-IP` on every request, so a caller can't send their own
and get a fresh allowance each time.

What Railway says (checked 2026-10-31):

- The docs ([Specs and limits](https://docs.railway.com/networking/public-networking/specs-and-limits), request
  headers) list `X-Real-IP` "for identifying client's remote IP", but don't say whether a value the client sends
  is replaced.
- Staff and moderator answers on Railway's Help Station say the edge writes `X-Real-IP` itself, so it can't be
  spoofed ([2026-09-22](https://station.railway.com/questions/verification-of-x-real-ip-header-handlin-e7ec8863)),
  and one user's measurement agrees: a spoofed `X-Real-IP` and `X-Forwarded-For` didn't reach the app
  ([2026-09-08](https://station.railway.com/questions/does-the-edge-strip-client-x-forwarded-f-613e5cb6)). The same
  thread reports a staff-acknowledged bug: on traffic routed through Railway's CDN, `X-Real-IP` carries the CDN
  node's address, not the client's. Railway publishes no formal guarantee.
- Requests over the private network (`*.railway.internal`) skip the edge, so any service in the project could
  send any `X-Real-IP`. Nothing but the public edge should call `web`.

So: **likely, not guaranteed.** On the first test deploy, check it: send the forms' endpoint more requests than
the limit allows, each with a different made-up `X-Real-IP` (e.g. `203.0.113.x`), and confirm the limit still
answers `429`. Repeat after any change to Railway's CDN settings for the service. If it fails, the limit has to
key on something the client can't set; tell lane F1, which owns the rate limit.

## The one-time waitlist import (at the DNS switch)

`scripts/import-waitlist.mjs` loads the old app's `leads`, `sketches` and `privacy_requests` (Justin's D1 export,
JSON or CSV per table) into `form_submission` records through `POST /t/:t/import/batch`:

- `leads` → `call_sheet`, one per email: the earliest sign-up is the record (its `submitted_at`), later non-empty
  answers (`zip`, `category`, `details` from the old `feedback`, or the oldest form's free-text `interests`) merge in.
  `placement` is where they first signed up (`source_page`, else `source`). The old `role` and `name` have no field.
- `sketches` → `storyboard_talent` / `storyboard_buyer`, answers from the JSON in `details`.
- `privacy_requests` → `privacy_request` (`message`).

It skips what is already there (a call-sheet email, or the same form, email and time), so it can run again; run it
before the live forms open, so nothing else writes meanwhile. Times without a zone (SQLite's `datetime()`) are read
as UTC. It prints counts, never values. Run it **inside the `web` service** (the only place that reaches the private API;
the bundle carries it as `tools/import-waitlist.mjs`), rehearsing on test first:

```bash
railway ssh --service web --environment test
```

Then, in that shell: copy the export into `/tmp/bg-export/` (e.g. `cat > /tmp/bg-export/leads.json` and paste, or
pipe it through `railway ssh`), and

```bash
read -rs COMPANY_OS_PLATFORM_KEY && export COMPANY_OS_PLATFORM_KEY
node tools/import-waitlist.mjs /tmp/bg-export --dry-run
node tools/import-waitlist.mjs /tmp/bg-export
rm -rf /tmp/bg-export; unset COMPANY_OS_PLATFORM_KEY
```

The export holds real people's data: never commit it, attach it to an issue or keep it after the import.

## Known gaps

- **A photo 404s once the Clerk session cookie has expired.** `/media/<id>` reads the session from Clerk's `__session`
  cookie (an `<img>` can't send a header). Clerk refreshes that cookie while the page is open, but a tab left long
  enough can request a private photo (a draft's, or one the owners are reviewing) with an expired one: Company OS
  refuses the private link, the public one doesn't exist for an unapproved profile, and the image 404s until the page
  is reloaded. Approved profiles' photos are unaffected (public link). No data is exposed either way.
- **The test deploy runs whichever branch's workflow it is started from.** `deploy-test.yml` can be dispatched from
  any branch, and a run uses that branch's workflow file with the `test` environment's secrets in scope. The guard is
  GitHub's, not the workflow's: the owner must restrict the `test` environment's *Deployment branches* to `main` and
  `companyos` (step 3 of the setup above). Until then, anyone who can push a branch can read the test secrets.
- **The test deploy's last check cannot prove the live build is this commit, or this customer's site.**
  `scripts/smoke-test-address.mjs` shows that *a* site behind this gate form answers at `APP_URL` (401 gate page,
  `/healthz/` 200) from outside, but `/healthz/` reports no commit or marker, so it cannot show that it is this build or
  this customer's site, and on a re-run it can pass against the previous instance while the new one is still starting.
  On a first deploy the check may also wait up to 90 s (the grace for Railway's 404 "Application not found") before it
  reports the domain as not attached or not verified.
- **IPv6 callers each get their own rate-limit bucket.** The public-form limit keys on the full `X-Real-IP`, and one
  IPv6 client controls a whole /64, so it can rotate addresses and never hit the limit. To do: key IPv6 by its /64, add
  a global ceiling for the form routes, and evict past 10,000 keys (the map's current cap). Company OS's submit
  identity limit (20 a second) still bounds the total.
- **`pages.yml` (the authors' GitHub Pages deploy) uses action tags, not commit SHAs.** A moved tag would run
  different code with the Pages deploy token. Every other workflow is pinned to SHAs, and `workflows.test.ts` refuses a
  tag in them; pinning `pages.yml` too is the authors' call (then drop its exception in that test).

