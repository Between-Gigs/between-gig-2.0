# Deploying 2.0 next to Company OS

2.0 runs as a Next server in Railway project **"Between Gigs OS"**, service `web`, next to Company OS's `api`, and
calls the API server-side over Railway's private network (Company OS decision log N-03). The GitHub Pages preview
stays as it is: a static export on the sample data, every route.

## Two builds

| | GitHub Pages preview | Server (test and production) |
| --- | --- | --- |
| Command | `pnpm build` | `pnpm build:server` (sets `BG_BUILD=server`) |
| Output | `out/` (static export, base path `/between-gig-2.0`) | `.next/standalone/` (Next server) |
| Routes | every route | the ship list's 18 "Make live" routes |
| Headers | none (Pages can't set them) | CSP with a per-request nonce, HSTS, nosniff, … |
| Workflow | `pages.yml` (unchanged) | `deploy-test.yml`, `deploy-prod.yml` |

`scripts/server-build.mjs` builds in a temporary copy of the working tree (what `git ls-files` lists, so committed,
changed and new files but no ignored ones such as `.env*`) without the internal and waiting folders (`INTERNAL`:
`app/workspace`, `app/studio`, `app/preview`, `app/emails`, `app/crew-call`, `app/proposals`, `public/artifacts`,
`public/studio-source`, `public/thumbs`, `public/workspace`), so they 404 and are not in the output. The real tree is
never touched; only `.next` comes back. It fails closed: `pnpm test` fails on a page that is in neither `LIVE_PAGES`
nor `INTERNAL`, or a `public/` folder in neither `PUBLIC_LIVE` nor `INTERNAL`, and `check-server.mjs` fails on anything
else in the build output. A route that moves from "Waiting on the client" to "Make live" comes off `INTERNAL` and onto
`LIVE_PAGES` and `LIVE_ROUTES`.

Files named `*.server.ts` / `*.server.tsx` (the proxy, the API and media route handlers) exist only in the server
build: only it adds those page extensions. `scripts/check-pages.mjs` checks the Pages export has every page and none
of them.

`pnpm check` runs both builds, `check-pages.mjs` after the export, then `pnpm check:server`: `scripts/check-bundle.mjs` (no `cos_svc_`, `sk_live`,
`sk_test`, `CLERK_SECRET` or `*.railway.internal` in what browsers download) and `scripts/check-server.mjs` (starts
the server: live routes 200, internal ones 404, headers and nonces on every page).

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
| `NEXT_PUBLIC_SITE_ORIGIN` | production only: `APP_URL` (share images). Test builds before their address is known, so its share images name the default origin |

**Runtime** (Railway service `web`, `.railway/railway.ts`; server only, never in the browser):

| Name | Value | Set by |
| --- | --- | --- |
| `COMPANY_OS_URL` | `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}` (private network) | the IaC |
| `COMPANY_OS_TENANT` | `between-gigs-dev` on test, `between-gigs` on production (N-13) | the IaC |
| `COMPANY_OS_READ_TOKEN` | `cos_svc_…`, a read identity (role `public_reader`): public pages | workflow, from the GitHub secret |
| `COMPANY_OS_SUBMIT_TOKEN` | `cos_svc_…`, a submit identity (role `form_submitter`, mode `submit`): public forms | workflow, from the GitHub secret |
| `APP_URL` | the site's origin, `https://…`, no trailing slash (test: the Railway domain) | workflow |
| `NODE_ENV`, `PORT`, `HOSTNAME` | `production`, `3000`, `0.0.0.0` | the IaC |

The platform key (`COMPANY_OS_PLATFORM_KEY`) is **not** on this service. It is only typed into a shell for the
one-time import below.

## What the owner sets up

1. **Railway:** nothing to create by hand. `web` is created by the first deploy in the project's existing `test` and
   `production` environments (Company OS runbook `customer-environments.md` §1). Production: after its first deploy,
   add the custom domain `between-gigs.com` to `web` (and the DNS records Railway shows).
2. **Service identities**, per environment, on the tenant (shown once; straight into the GitHub secret):
   `POST /platform/tenants/<tenant>/service-identities` with `{ "name": "2.0 public reads", "roleKey": "public_reader" }`
   and `{ "name": "2.0 public forms", "roleKey": "form_submitter", "mode": "submit" }`.
3. **GitHub environments** in this repo (Settings → Environments), created before the first run:
   - `test`: secrets `RAILWAY_TOKEN` (the test project token), `COMPANY_OS_READ_TOKEN`, `COMPANY_OS_SUBMIT_TOKEN`; variables `CLERK_PUBLISHABLE_KEY` (`pk_test_…`),
     `RAILWAY_PROJECT_NAME` (`Between Gigs OS`), `RAILWAY_REGION` (`us-east4-eqdc4a`).
   - `production`: the same names with production values (`pk_live_…`, the production token and
     identities), plus the variable `APP_URL` (`https://between-gigs.com`).
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
5. **Order** (rule E9): Company OS *Deploy API (test)* → this repo's *Deploy web (test)* → put the printed address
   in Company OS `test-between-gigs`'s `APP_URL` and deploy the API (test) again → test the flows →
   Company OS *Deploy API (prod)* → *Cut release* here (bump `package.json`'s version first) → *Deploy web (prod)*
   from that tag. Rollback: deploy the previous tag.

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
